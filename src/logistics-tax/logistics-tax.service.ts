import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { ManagementRecordRepository } from "../database/management-record.repository";
import { assessLegalSource, type LegalSourceInput } from "./legal-source";
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
  | "complianceObligations"
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
    const legalSourceAssessment =
      input.legalSource && typeof input.legalSource === "object"
        ? assessLegalSource(input.legalSource as LegalSourceInput, {
            countryCode:
              typeof input.countryCode === "string" ? input.countryCode : null,
            subnationalCode:
              typeof input.subnationalCode === "string"
                ? input.subnationalCode
                : null,
          })
        : null;
    const ls = legalSourceAssessment ? { legalSourceAssessment } : {};

    if (resource === "taxRules") {
      const creditRegime =
        typeof input.creditRegime === "string" ? input.creditRegime : null;
      const rateType =
        typeof input.rateType === "string" ? input.rateType : null;
      const rate =
        typeof input.ratePercent === "number" ? input.ratePercent : null;
      const inputCreditRecoverable =
        creditRegime === "NON_CUMULATIVE" || creditRegime === "PARTIAL"
          ? true
          : creditRegime === "CUMULATIVE" || creditRegime === "NON_CREDITABLE"
            ? false
            : null;
      const exemptOrZero = rateType === "EXEMPT" || rateType === "ZERO_RATED";
      return {
        inputCreditRecoverable,
        rateConsistency:
          exemptOrZero && rate !== null && rate > 0
            ? "INCONSISTENT_RATE_FOR_EXEMPTION"
            : "OK",
        ...ls,
      };
    }
    if (
      resource === "taxRecoveryOpportunities" &&
      typeof input.statutoryDeadline === "string"
    ) {
      const deadline = new Date(input.statutoryDeadline).getTime();
      const daysUntilDeadline = Math.ceil((deadline - Date.now()) / 86_400_000);
      const channel =
        typeof input.recoveryChannel === "string" ? input.recoveryChannel : "";
      // Judicial routes require earlier action than administrative/offset routes.
      const channelLeadDays =
        channel === "JUDICIAL_CLAIM"
          ? 90
          : channel === "ADMINISTRATIVE_CLAIM"
            ? 45
            : 30;
      const classify = (days: number) =>
        days < 0
          ? "EXPIRED"
          : days <= 30
            ? "CRITICAL"
            : days <= 90
              ? "HIGH"
              : days <= 180
                ? "MEDIUM"
                : "MONITOR";
      const channelAdjustedDaysRemaining = daysUntilDeadline - channelLeadDays;
      return {
        daysUntilDeadline,
        prescriptionRisk: classify(daysUntilDeadline),
        recoveryChannelLeadDays: channelLeadDays,
        channelAdjustedDaysRemaining,
        channelAdjustedPrescriptionRisk: classify(channelAdjustedDaysRemaining),
        ...ls,
      };
    }
    if (resource === "permanentEstablishmentAssessments") {
      return {
        conclusionType: "PRELIMINARY_INDICATOR_ONLY",
        requiresLocalCounsel: true,
        ...ls,
      };
    }
    if (
      resource === "complianceObligations" &&
      typeof input.dueDate === "string"
    ) {
      const due = new Date(input.dueDate).getTime();
      const daysUntilDue = Math.ceil((due - Date.now()) / 86_400_000);
      return {
        daysUntilDue,
        filingRisk:
          daysUntilDue < 0
            ? "OVERDUE"
            : daysUntilDue <= 15
              ? "IMMINENT"
              : daysUntilDue <= 45
                ? "APPROACHING"
                : "ON_TRACK",
        ...ls,
      };
    }
    if (resource === "integrationConnections") {
      return { credentialsStored: false, ...ls };
    }
    return { ...ls };
  }
}
