import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client";
import { DatabaseService } from "./database.service";

// ropaApprovals: compliance evidence that must survive retention purges.
// demoSeeds: operational idempotency marker — purging it would re-trigger seeding.
const PURGE_EXEMPT_RESOURCE_TYPES = new Set(["ropaApprovals", "demoSeeds"]);

export type StoredRecord = Record<string, unknown> & {
  id: string;
  tenantId: string;
  createdAt: string;
};

@Injectable()
export class ManagementRecordRepository {
  private readonly memory: StoredRecord[] = [];

  constructor(private readonly database: DatabaseService) {}

  async create(
    resourceType: string,
    record: StoredRecord,
    countryCodes: string[] = [],
  ): Promise<StoredRecord> {
    // Strip internal control fields before any write so no caller — HTTP, seed script,
    // test, or migration — can persist a pre-tombstoned or mis-classified record.
    const payload = { ...record } as Record<string, unknown>;
    delete payload.__erased;
    delete payload.erasedAt;
    delete payload.__resourceType;
    const clean = payload as StoredRecord;

    if (!this.database.enabled) {
      this.memory.push({ ...clean, __resourceType: resourceType });
      return structuredClone(clean);
    }
    await this.database.withTenant(clean.tenantId, async (transaction) => {
      await transaction.managementRecord.create({
        data: {
          id: clean.id,
          tenantId: clean.tenantId,
          resourceType,
          countryCodes: countryCodes as Prisma.InputJsonValue,
          payload: clean as Prisma.InputJsonValue,
        },
      });
    });
    return structuredClone(clean);
  }

  async list(resourceType: string, tenantId: string): Promise<StoredRecord[]> {
    if (!this.database.enabled) {
      return this.memory
        .filter(
          (record) =>
            record.tenantId === tenantId &&
            record.__resourceType === resourceType &&
            !record.__erased,
        )
        .map(stripInternalResourceType);
    }
    return this.database.withTenant(tenantId, async (transaction) => {
      const records = await transaction.managementRecord.findMany({
        where: { resourceType, tenantId },
        orderBy: { createdAt: "asc" },
      });
      return records
        .map((record) => record.payload as StoredRecord)
        .filter((payload) => !payload.__erased);
    });
  }

  // Anonymizes records past the retention cutoff; dry-run only reports eligibility.
  // ropaApprovals are compliance evidence — they must never be erased by retention.
  async purgeExpired(
    tenantId: string,
    cutoffIso: string,
    apply: boolean,
  ): Promise<{ eligible: string[]; purged: number }> {
    if (!this.database.enabled) {
      const matches = this.memory.filter(
        (record) =>
          record.tenantId === tenantId &&
          record.createdAt < cutoffIso &&
          !PURGE_EXEMPT_RESOURCE_TYPES.has(record.__resourceType as string) &&
          !record.__erased,
      );
      if (apply) {
        for (const record of matches) tombstone(record);
      }
      return {
        eligible: matches.map((record) => record.id),
        purged: apply ? matches.length : 0,
      };
    }
    return this.database.withTenant(tenantId, async (transaction) => {
      const rows = await transaction.managementRecord.findMany({
        where: {
          tenantId,
          createdAt: { lt: new Date(cutoffIso) },
          resourceType: { notIn: [...PURGE_EXEMPT_RESOURCE_TYPES] },
        },
        select: { id: true, payload: true },
      });
      const eligible = rows
        .filter((row) => !(row.payload as Record<string, unknown>).__erased)
        .map((row) => row.id);
      if (apply && eligible.length > 0) {
        // Single batch update instead of one UPDATE per record; the id column on the
        // table row already identifies each record — no need to repeat it in the payload.
        await transaction.managementRecord.updateMany({
          where: { id: { in: eligible } },
          data: {
            payload: {
              tenantId,
              __erased: true,
              erasedAt: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        });
      }
      return { eligible, purged: apply ? eligible.length : 0 };
    });
  }
}

function tombstone(record: StoredRecord): void {
  for (const key of Object.keys(record)) {
    if (!["id", "tenantId", "createdAt", "__resourceType"].includes(key)) {
      delete record[key];
    }
  }
  record.__erased = true;
  record.erasedAt = new Date().toISOString();
}

function stripInternalResourceType(record: StoredRecord): StoredRecord {
  const copy = structuredClone(record);
  delete copy.__resourceType;
  return copy;
}
