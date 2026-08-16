import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { ManagementRecordRepository } from "../database/management-record.repository";
import type { DomainRecord } from "./logistics-tax.types";

export type LogisticsResource =
  | "operationalProfiles"
  | "legalEntities"
  | "establishments"
  | "logisticsLanes"
  | "customsRegimes"
  | "taxRules"
  | "taxDocuments"
  | "taxRecoveryOpportunities"
  | "permanentEstablishmentAssessments"
  | "integrationConnections";

@Injectable()
export class LogisticsTaxService {
  constructor(private readonly repository: ManagementRecordRepository) {}

  async list(
    resource: LogisticsResource,
    request: Request,
  ): Promise<DomainRecord[]> {
    const actor = request.actor!;
    const records = await this.repository.list(resource, actor.tenantId);
    return records
      .filter((record) =>
        this.isVisibleForCountryScopes(
          record as DomainRecord,
          actor.countryScopes,
        ),
      )
      .map((record) => ({ ...record }) as DomainRecord);
  }

  async create(
    resource: LogisticsResource,
    request: Request,
    input: Record<string, unknown>,
    countryCodes: string[] = [],
  ): Promise<DomainRecord> {
    const now = new Date().toISOString();
    const record: DomainRecord = {
      id: randomUUID(),
      tenantId: request.actor!.tenantId,
      ...input,
      ...this.analysisFields(resource, input),
      createdAt: now,
      updatedAt: now,
    };
    return (await this.repository.create(
      resource,
      record,
      countryCodes,
    )) as DomainRecord;
  }

  private isVisibleForCountryScopes(
    record: DomainRecord,
    scopes: string[],
  ): boolean {
    if (scopes.length === 0) return true;
    const recordCountries = [
      record.countryCode,
      record.hostCountryCode,
      record.originCountryCode,
      record.destinationCountryCode,
    ].filter((value): value is string => typeof value === "string");
    return (
      recordCountries.length === 0 ||
      recordCountries.every((code) => scopes.includes(code))
    );
  }

  private analysisFields(
    resource: LogisticsResource,
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    if (
      resource === "taxRecoveryOpportunities" &&
      typeof input.statutoryDeadline === "string"
    ) {
      const deadline = new Date(input.statutoryDeadline).getTime();
      const daysUntilDeadline = Math.ceil((deadline - Date.now()) / 86_400_000);
      return {
        daysUntilDeadline,
        prescriptionRisk:
          daysUntilDeadline < 0
            ? "EXPIRED"
            : daysUntilDeadline <= 30
              ? "CRITICAL"
              : daysUntilDeadline <= 90
                ? "HIGH"
                : daysUntilDeadline <= 180
                  ? "MEDIUM"
                  : "MONITOR",
      };
    }
    if (resource === "permanentEstablishmentAssessments") {
      return {
        conclusionType: "PRELIMINARY_INDICATOR_ONLY",
        requiresLocalCounsel: true,
      };
    }
    if (resource === "integrationConnections") {
      return { credentialsStored: false };
    }
    return {};
  }
}
