import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client";
import { DatabaseService } from "./database.service";

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
    if (!this.database.enabled) {
      this.memory.push({ ...record, __resourceType: resourceType });
      return structuredClone(record);
    }
    await this.database.withTenant(record.tenantId, async (transaction) => {
      await transaction.managementRecord.create({
        data: {
          id: record.id,
          tenantId: record.tenantId,
          resourceType,
          countryCodes: countryCodes as Prisma.InputJsonValue,
          payload: record as Prisma.InputJsonValue,
        },
      });
    });
    return structuredClone(record);
  }

  async list(resourceType: string, tenantId: string): Promise<StoredRecord[]> {
    if (!this.database.enabled) {
      return this.memory
        .filter(
          (record) =>
            record.tenantId === tenantId &&
            record.__resourceType === resourceType,
        )
        .map(stripInternalResourceType);
    }
    return this.database.withTenant(tenantId, async (transaction) => {
      const records = await transaction.managementRecord.findMany({
        where: { resourceType },
        orderBy: { createdAt: "asc" },
      });
      return records.map((record) => record.payload as StoredRecord);
    });
  }

  // Anonymizes records past the retention cutoff; dry-run only reports eligibility.
  async purgeExpired(
    tenantId: string,
    cutoffIso: string,
    apply: boolean,
  ): Promise<{ eligible: string[]; purged: number }> {
    if (!this.database.enabled) {
      const matches = this.memory.filter(
        (record) =>
          record.tenantId === tenantId && record.createdAt < cutoffIso,
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
        where: { createdAt: { lt: new Date(cutoffIso) } },
        select: { id: true },
      });
      const eligible = rows.map((row) => row.id);
      if (apply) {
        for (const id of eligible) {
          await transaction.managementRecord.update({
            where: { id },
            data: {
              payload: {
                id,
                tenantId,
                __erased: true,
                erasedAt: new Date().toISOString(),
              } as Prisma.InputJsonValue,
            },
          });
        }
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
