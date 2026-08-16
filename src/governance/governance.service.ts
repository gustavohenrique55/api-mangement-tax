import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { ManagementRecordRepository } from "../database/management-record.repository";
import type {
  CreateCfoConfigurationDto,
  CreateTaxOfficeDto,
} from "./governance.dto";

@Injectable()
export class GovernanceService {
  constructor(private readonly repository: ManagementRecordRepository) {}

  async createCfoConfiguration(
    request: Request,
    input: CreateCfoConfigurationDto,
  ) {
    const entries = Object.entries(input.countryMaterialityWeights);
    if (
      entries.some(
        ([code, weight]) =>
          !/^[A-Z]{2}$/.test(code) || typeof weight !== "number" || weight < 0,
      )
    ) {
      throw new BadRequestException(
        "countryMaterialityWeights must map ISO alpha-2 codes to non-negative numbers",
      );
    }
    const totalWeight = round(
      entries.reduce((total, [, value]) => total + value, 0),
    );
    if (totalWeight !== 100)
      throw new BadRequestException(
        `countryMaterialityWeights must total 100; received ${totalWeight}`,
      );
    if (input.approvalStatus !== "DRAFT" && !input.approvedBy)
      throw new BadRequestException(
        "approvedBy is required for an approved configuration",
      );
    return this.store("cfoConfigurations", request, {
      ...input,
      totalCountryWeight: totalWeight,
      calibrationRequired: input.approvalStatus === "DRAFT",
    });
  }

  async createTaxOffice(request: Request, input: CreateTaxOfficeDto) {
    if (input.hubRole === "NONE" && input.parentHubCode === input.officeCode)
      throw new BadRequestException("An office cannot be its own parent hub");
    return this.store("taxOffices", request, { ...input }, [input.countryCode]);
  }

  list(resourceType: string, request: Request) {
    return this.repository.list(resourceType, request.actor!.tenantId);
  }

  async latestCfoConfiguration(request: Request) {
    const records = await this.list("cfoConfigurations", request);
    return records.at(-1) ?? null;
  }

  async networkSummary(request: Request) {
    const offices = await this.list("taxOffices", request);
    return {
      officeCount: offices.length,
      annualFeesEur: round(
        offices.reduce(
          (total, office) => total + Number(office.annualFeesEur ?? 0),
          0,
        ),
      ),
      byTier: countBy(offices, "tier"),
      byContractStatus: countBy(offices, "contractStatus"),
      powerOfAttorneyGaps: offices.filter((office) =>
        ["PENDING", "EXPIRED"].includes(String(office.powerOfAttorneyStatus)),
      ).length,
      privilegeProtocolPending: offices.filter(
        (office) => office.privilegeProtocol === "PENDING_REVIEW",
      ).length,
      coverageGaps: offices.filter((office) => office.contractStatus === "GAP")
        .length,
    };
  }

  private store(
    resourceType: string,
    request: Request,
    value: Record<string, unknown>,
    countryCodes: string[] = [],
  ) {
    return this.repository.create(
      resourceType,
      {
        id: randomUUID(),
        tenantId: request.actor!.tenantId,
        ...value,
        createdAt: new Date().toISOString(),
      },
      countryCodes,
    );
  }
}

function countBy(items: Record<string, unknown>[], key: string) {
  return items.reduce<Record<string, number>>((result, item) => {
    const value = String(item[key] ?? "UNKNOWN");
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
