import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../generated/prisma/client";

export interface AuditEventRecord {
  id: string;
  tenantId: string;
  occurredAt: string;
  actorSubject: string;
  action: string;
  resourceType: string;
  resourceId: string;
  correlationId: string;
  metadata: Record<string, unknown>;
  previousMac: string | null;
  mac: string;
}

const POSTGRES_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly enabled: boolean;
  private readonly client?: PrismaClient;
  private readonly appRole: string | undefined;
  private readonly auditRole: string | undefined;
  private readonly memoryTenants = new Set<string>();

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    this.enabled =
      process.env.PERSISTENCE_MODE !== "memory" && Boolean(connectionString);
    this.appRole = validateRole(
      "DATABASE_APP_ROLE",
      process.env.DATABASE_APP_ROLE,
    );
    this.auditRole = validateRole(
      "DATABASE_AUDIT_ROLE",
      process.env.DATABASE_AUDIT_ROLE,
    );
    if (this.enabled && connectionString) {
      this.client = new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
      });
    }
  }

  async withTenant<T>(
    tenantId: string,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!this.client) throw new Error("PostgreSQL persistence is not enabled");
    return this.client.$transaction(async (transaction) => {
      await this.enterTenant(transaction, tenantId, this.appRole);
      return operation(transaction);
    });
  }

  async appendAuditEvent(
    tenantId: string,
    build: (previousMac: string | null) => AuditEventRecord,
  ): Promise<AuditEventRecord> {
    if (!this.client) throw new Error("PostgreSQL persistence is not enabled");
    return this.client.$transaction(async (transaction) => {
      await this.enterTenant(transaction, tenantId, this.appRole);
      // Separation of duties: the audit table only accepts inserts from the writer role.
      if (this.auditRole) {
        await transaction.$executeRawUnsafe(
          `SET LOCAL ROLE "${this.auditRole}"`,
        );
      }
      const previous = await transaction.auditEvent.findFirst({
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        select: { mac: true },
      });
      const event = build(previous?.mac ?? null);
      await transaction.auditEvent.create({
        data: {
          id: event.id,
          tenantId: event.tenantId,
          occurredAt: new Date(event.occurredAt),
          actorSubject: event.actorSubject,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          correlationId: event.correlationId,
          metadata: event.metadata as Prisma.InputJsonValue,
          previousMac: event.previousMac,
          mac: event.mac,
        },
      });
      return event;
    });
  }

  async listAuditEvents(tenantId: string): Promise<AuditEventRecord[]> {
    return this.withTenant(tenantId, async (transaction) => {
      const rows = await transaction.auditEvent.findMany({
        orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      });
      return rows.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        occurredAt: row.occurredAt.toISOString(),
        actorSubject: row.actorSubject,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        correlationId: row.correlationId,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
        previousMac: row.previousMac,
        mac: row.mac,
      }));
    });
  }

  async provisionTenant(
    tenantId: string,
    displayName: string,
  ): Promise<{ created: boolean }> {
    if (!this.client) {
      const created = !this.memoryTenants.has(tenantId);
      this.memoryTenants.add(tenantId);
      return { created };
    }
    return this.client.$transaction(async (transaction) => {
      if (this.appRole) {
        await transaction.$executeRawUnsafe(`SET LOCAL ROLE "${this.appRole}"`);
      }
      await transaction.$executeRawUnsafe(
        "SELECT set_config('app.tenant_id', $1, true)",
        tenantId,
      );
      const existing = await transaction.tenant.findUnique({
        where: { id: tenantId },
      });
      if (existing) return { created: false };
      await transaction.tenant.create({
        data: { id: tenantId, displayName },
      });
      return { created: true };
    });
  }

  private async enterTenant(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    role?: string,
  ): Promise<void> {
    if (role) {
      await transaction.$executeRawUnsafe(`SET LOCAL ROLE "${role}"`);
    }
    await transaction.$executeRawUnsafe(
      "SELECT set_config('app.tenant_id', $1, true)",
      tenantId,
    );
    await transaction.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: {
        id: tenantId,
        displayName: process.env.COMPANY_DISPLAY_NAME ?? "Empresa Confidencial",
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.$disconnect();
  }
}

function validateRole(
  name: string,
  value: string | undefined,
): string | undefined {
  if (value && !POSTGRES_IDENTIFIER.test(value)) {
    throw new Error(`${name} must be a valid PostgreSQL identifier`);
  }
  return value;
}
