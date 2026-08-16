import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service";
import type {
  CreateJurisdictionDto,
  UpdateJurisdictionDto,
} from "./jurisdiction.dto";
import {
  COUNTRY_GROUPS,
  type JurisdictionType,
  type ManagementBlock,
} from "./country-groups";

type ApplicableLawModel =
  | "SOVEREIGN_DOMESTIC_LAW"
  | "TERRITORY_SPECIFIC_WITH_SOVEREIGN_FRAMEWORK";

export interface Jurisdiction {
  id: string;
  tenantId: string;
  countryCode: string;
  name: string;
  managementBlock: ManagementBlock;
  jurisdictionType: JurisdictionType;
  sovereignAuthorityCode: string | null;
  applicableLawModel: ApplicableLawModel;
  legalValidationStatus: "REQUIRED_LOCAL_COUNSEL";
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class JurisdictionsService {
  private readonly records: Jurisdiction[] = [];

  constructor(private readonly database: DatabaseService) {}

  async list(tenantId: string, scopes: string[]): Promise<Jurisdiction[]> {
    if (!this.database.enabled) {
      return this.records.filter(
        (record) =>
          record.tenantId === tenantId &&
          (scopes.length === 0 || scopes.includes(record.countryCode)),
      );
    }
    return this.database.withTenant(tenantId, async (transaction) => {
      const rows = await transaction.jurisdiction.findMany({
        where:
          scopes.length === 0 ? {} : { countryCode: { in: scopes } },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toDomain);
    });
  }

  countryGroups() {
    return COUNTRY_GROUPS;
  }

  async create(
    tenantId: string,
    input: CreateJurisdictionDto,
  ): Promise<Jurisdiction> {
    const countryCode = input.countryCode.toUpperCase();
    const isSovereign = input.jurisdictionType === "SOVEREIGN_STATE";
    if (isSovereign && input.sovereignAuthorityCode) {
      throw new BadRequestException(
        "Sovereign jurisdiction cannot have a sovereign authority code",
      );
    }
    const applicableLawModel: ApplicableLawModel = isSovereign
      ? "SOVEREIGN_DOMESTIC_LAW"
      : "TERRITORY_SPECIFIC_WITH_SOVEREIGN_FRAMEWORK";
    const sovereignAuthorityCode =
      input.sovereignAuthorityCode?.toUpperCase() ?? null;

    if (!this.database.enabled) {
      if (
        this.records.some(
          (item) =>
            item.tenantId === tenantId && item.countryCode === countryCode,
        )
      ) {
        throw new ConflictException(
          "Jurisdiction already exists for this tenant",
        );
      }
      const now = new Date().toISOString();
      const record: Jurisdiction = {
        id: randomUUID(),
        tenantId,
        countryCode,
        name: input.name,
        managementBlock: input.managementBlock,
        jurisdictionType: input.jurisdictionType,
        sovereignAuthorityCode,
        applicableLawModel,
        legalValidationStatus: "REQUIRED_LOCAL_COUNSEL",
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      this.records.push(record);
      return record;
    }

    return this.database.withTenant(tenantId, async (transaction) => {
      const existing = await transaction.jurisdiction.findFirst({
        where: { countryCode },
      });
      if (existing) {
        throw new ConflictException(
          "Jurisdiction already exists for this tenant",
        );
      }
      const row = await transaction.jurisdiction.create({
        data: {
          tenantId,
          countryCode,
          name: input.name,
          managementBlock: input.managementBlock,
          jurisdictionType: input.jurisdictionType,
          sovereignAuthorityCode,
          applicableLawModel,
          legalValidationStatus: "REQUIRED_LOCAL_COUNSEL",
          status: "active",
        },
      });
      return toDomain(row);
    });
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateJurisdictionDto,
    scopes: string[],
  ): Promise<Jurisdiction> {
    if (!this.database.enabled) {
      const record = this.records.find(
        (item) => item.tenantId === tenantId && item.id === id,
      );
      if (!record) throw new NotFoundException("Jurisdiction not found");
      if (scopes.length > 0 && !scopes.includes(record.countryCode))
        throw new NotFoundException("Jurisdiction not found");
      if (input.name !== undefined) record.name = input.name;
      if (input.status !== undefined) record.status = input.status;
      record.updatedAt = new Date().toISOString();
      return record;
    }

    return this.database.withTenant(tenantId, async (transaction) => {
      const row = await transaction.jurisdiction.findFirst({ where: { id } });
      if (!row || (scopes.length > 0 && !scopes.includes(row.countryCode)))
        throw new NotFoundException("Jurisdiction not found");
      const updated = await transaction.jurisdiction.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      return toDomain(updated);
    });
  }
}

function toDomain(row: {
  id: string;
  tenantId: string;
  countryCode: string;
  name: string;
  managementBlock: string;
  jurisdictionType: string;
  sovereignAuthorityCode: string | null;
  applicableLawModel: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): Jurisdiction {
  return {
    id: row.id,
    tenantId: row.tenantId,
    countryCode: row.countryCode,
    name: row.name,
    managementBlock: row.managementBlock as ManagementBlock,
    jurisdictionType: row.jurisdictionType as JurisdictionType,
    sovereignAuthorityCode: row.sovereignAuthorityCode,
    applicableLawModel: row.applicableLawModel as ApplicableLawModel,
    legalValidationStatus: "REQUIRED_LOCAL_COUNSEL",
    status: row.status as "active" | "inactive",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
