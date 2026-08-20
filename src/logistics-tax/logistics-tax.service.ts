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
    const now = Date.now();
    return records
      .filter((record) =>
        this.isVisibleForCountryScopes(
          record as DomainRecord,
          actor.countryScopes,
        ),
      )
      .map((record) =>
        this.withLegalSourceAssessment({ ...record } as DomainRecord, now),
      );
  }

  async create(
    resource: LogisticsResource,
    request: Request,
    input: Record<string, unknown>,
    countryCodes: string[] = [],
  ): Promise<DomainRecord> {
    const now = Date.now();
    const isoNow = new Date(now).toISOString();
    const record: DomainRecord = {
      id: randomUUID(),
      tenantId: request.actor!.tenantId,
      ...input,
      ...this.analysisFields(resource, input, now),
      createdAt: isoNow,
      updatedAt: isoNow,
    };
    const stored = (await this.repository.create(
      resource,
      record,
      countryCodes,
    )) as DomainRecord;
    return this.withLegalSourceAssessment(stored, now);
  }

  private withLegalSourceAssessment(record: DomainRecord, now: number): DomainRecord {
    const src = record.legalSource;
    if (
      src !== null &&
      src !== undefined &&
      typeof src === "object" &&
      !Array.isArray(src)
    ) {
      return {
        ...record,
        legalSourceAssessment: assessLegalSource(
          src as LegalSourceInput,
          {
            countryCode:
              typeof record.countryCode === "string" ? record.countryCode : null,
            subnationalCode:
              typeof record.subnationalCode === "string"
                ? record.subnationalCode
                : null,
          },
          now,
        ),
      };
    }
    return record;
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
    now: number,
  ): Record<string, unknown> {
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
      };
    }
    if (
      resource === "taxRecoveryOpportunities" &&
      typeof input.statutoryDeadline === "string"
    ) {
      const deadline = new Date(input.statutoryDeadline).getTime();
      const daysUntilDeadline = Math.ceil((deadline - now) / 86_400_000);
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
      };
    }
    if (resource === "permanentEstablishmentAssessments") {
      return {
        conclusionType: "PRELIMINARY_INDICATOR_ONLY",
        requiresLocalCounsel: true,
      };
    }
    if (resource === "complianceObligations") {
      const inputStatus =
        typeof input.status === "string" ? input.status : null;
      const hasDueDate = typeof input.dueDate === "string";
      const daysUntilDue = hasDueDate
        ? Math.ceil((new Date(input.dueDate as string).getTime() - now) / 86_400_000)
        : null;
      if (
        inputStatus === "FILED" ||
        inputStatus === "EXEMPT" ||
        inputStatus === "NOT_APPLICABLE"
      ) {
        return daysUntilDue !== null
          ? { daysUntilDue, filingRisk: "RESOLVED" }
          : { filingRisk: "RESOLVED" };
      }
      // OVERDUE set explicitly without a deadline: trust the caller's stated status.
      if (inputStatus === "OVERDUE" && daysUntilDue === null) {
        return { filingRisk: "OVERDUE" };
      }
      if (daysUntilDue === null) return {};
      const filingRisk =
        daysUntilDue < 0
          ? "OVERDUE"
          : daysUntilDue <= 15
            ? "IMMINENT"
            : daysUntilDue <= 45
              ? "APPROACHING"
              : "ON_TRACK";
      return { daysUntilDue, filingRisk };
    }
    if (resource === "integrationConnections") {
      return { credentialsStored: false };
    }
    return {};
  }
}
