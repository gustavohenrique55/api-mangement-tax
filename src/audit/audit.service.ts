import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { createHmac, randomUUID } from "node:crypto";
import {
  DatabaseService,
  type AuditEventRecord,
} from "../database/database.service";

export type AuditEvent = AuditEventRecord;

@Injectable()
export class AuditService {
  private readonly events: AuditEvent[] = [];

  constructor(private readonly database: DatabaseService) {}

  async append(
    request: Request,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ): Promise<AuditEvent> {
    return this.persist({
      id: randomUUID(),
      tenantId: request.actor!.tenantId,
      occurredAt: new Date().toISOString(),
      actorSubject: request.actor!.subject,
      action,
      resourceType,
      resourceId,
      correlationId: request.correlationId,
      metadata,
    });
  }

  // System-initiated events (scheduled jobs) have no HTTP request context.
  async appendSystem(
    tenantId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ): Promise<AuditEvent> {
    return this.persist({
      id: randomUUID(),
      tenantId,
      occurredAt: new Date().toISOString(),
      actorSubject: "system:retention-job",
      action,
      resourceType,
      resourceId,
      correlationId: randomUUID(),
      metadata,
    });
  }

  private async persist(
    base: Omit<AuditEvent, "previousMac" | "mac">,
  ): Promise<AuditEvent> {
    const sign = (previousMac: string | null): AuditEvent => {
      const unsigned = { ...base, previousMac };
      return { ...unsigned, mac: this.sign(unsigned) };
    };
    if (this.database.enabled) {
      return this.database.appendAuditEvent(base.tenantId, sign);
    }
    const previous = [...this.events]
      .reverse()
      .find((event) => event.tenantId === base.tenantId);
    const event = sign(previous?.mac ?? null);
    this.events.push(event);
    return event;
  }

  async list(tenantId: string): Promise<AuditEvent[]> {
    if (this.database.enabled) return this.database.listAuditEvents(tenantId);
    return this.events
      .filter((event) => event.tenantId === tenantId)
      .map((event) => ({ ...event }));
  }

  async verify(tenantId: string): Promise<boolean> {
    const events = await this.list(tenantId);
    let previousMac: string | null = null;
    for (const event of events) {
      const { mac, ...unsigned } = event;
      if (unsigned.previousMac !== previousMac || this.sign(unsigned) !== mac)
        return false;
      previousMac = mac;
    }
    return true;
  }

  private sign(value: object): string {
    const key =
      process.env.AUDIT_HMAC_KEY ??
      "development-only-change-me-32-bytes-minimum";
    return createHmac("sha256", key).update(stableJson(value)).digest("hex");
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
