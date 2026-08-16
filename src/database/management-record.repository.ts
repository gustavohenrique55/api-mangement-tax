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
}

function stripInternalResourceType(record: StoredRecord): StoredRecord {
  const copy = structuredClone(record);
  delete copy.__resourceType;
  return copy;
}
