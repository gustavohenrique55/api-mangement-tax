import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { ManagementRecordRepository } from "../database/management-record.repository";
import { GovernanceService } from "../governance/governance.service";
import { IndicatorsService } from "../indicators/indicators.service";
import { LogisticsTaxService } from "../logistics-tax/logistics-tax.service";

const COUNTRIES = [
  {
    code: "BR",
    tier: "TIER_1",
    weight: 25,
    tradition: "CIVIL_LAW",
    factor: 0.95,
  },
  { code: "MX", tier: "TIER_1", weight: 20, tradition: "CIVIL_LAW", factor: 1 },
  {
    code: "CO",
    tier: "TIER_1",
    weight: 15,
    tradition: "CIVIL_LAW",
    factor: 0.9,
  },
  {
    code: "AR",
    tier: "TIER_2",
    weight: 12,
    tradition: "CIVIL_LAW",
    factor: 0.72,
  },
  {
    code: "PA",
    tier: "TIER_3",
    weight: 10,
    tradition: "CIVIL_LAW",
    factor: 0.84,
  },
  { code: "PR", tier: "TIER_4", weight: 7, tradition: "MIXED", factor: 0.68 },
  {
    code: "KY",
    tier: "TIER_4",
    weight: 6,
    tradition: "COMMON_LAW",
    factor: 0.62,
  },
  {
    code: "VE",
    tier: "TIER_5",
    weight: 5,
    tradition: "CIVIL_LAW",
    factor: 0.42,
  },
] as const;

@Injectable()
export class DemoService {
  constructor(
    private readonly repository: ManagementRecordRepository,
    private readonly governance: GovernanceService,
    private readonly indicators: IndicatorsService,
    private readonly logistics: LogisticsTaxService,
  ) {}

  async seed(request: Request) {
    const existing = await this.repository.list(
      "demoSeeds",
      request.actor!.tenantId,
    );
    if (existing.length)
      return {
        seeded: false,
        reason: "ALREADY_SEEDED",
        summary: existing.at(-1),
      };

    await this.governance.createCfoConfiguration(request, {
      version: "DEMO-2026-Q3",
      effectiveFrom: "2026-07-01",
      baselineDate: "2026-01-01",
      reportingCurrency: "EUR",
      complementaryCurrency: "USD",
      materialityAbsoluteEur: 250000,
      materialityEbitdaPercent: 1,
      riskSuccessProbabilityThresholdPercent: 60,
      maxUnprovisionedExposureEur: 500000,
      simpleSlaHours: 48,
      complexSlaHours: 120,
      countryMaterialityWeights: Object.fromEntries(
        COUNTRIES.map((country) => [country.code, country.weight]),
      ),
      approvalStatus: "DRAFT",
    });

    for (const [index, country] of COUNTRIES.entries()) {
      await this.governance.createTaxOffice(request, {
        officeCode: `OFF-${country.code}`,
        anonymizedName: `Escritório Local ${country.code} — Sintético`,
        countryCode: country.code,
        tier: country.tier,
        legalTradition: country.tradition,
        scope: ["COMPLIANCE", "ADVISORY", "LITIGATION"],
        contractStatus: country.code === "KY" ? "UNDER_REVIEW" : "ACTIVE",
        hubRole: ["BR", "PA"].includes(country.code) ? "REGIONAL_HUB" : "NONE",
        feeModel: "HYBRID",
        annualFeesEur: 30000 + index * 5000,
        simpleSlaHours: 48,
        complexSlaHours: 120,
        powerOfAttorneyStatus: country.code === "VE" ? "PENDING" : "CONFIRMED",
        scorecardCadence: ["TIER_1", "TIER_2"].includes(country.tier)
          ? "QUARTERLY"
          : "SEMIANNUAL",
        privilegeProtocol:
          country.tradition === "COMMON_LAW" ? "PENDING_REVIEW" : "DOCUMENTED",
        legalValidationStatus: "PRELIMINARY",
      });

      const total = 20;
      const favorable = Math.round(total * 0.7 * country.factor);
      await this.indicators.createScorecard(request, {
        officeName: `Escritório Local ${country.code} — Sintético`,
        countryCode: country.code,
        tier: country.tier,
        period: "2026-Q3",
        calibrationStatus: "BASELINE",
        closedDisputes: total,
        favorableDisputes: favorable,
        opinionsIssued: 20,
        opinionsReturnedForCorrection: Math.round(1 / country.factor),
        averageSimpleResponseDays: round(5 / country.factor),
        averageComplexResponseDays: round(15 / country.factor),
        obligationsTotal: 100,
        obligationsOnTime: Math.round(100 * country.factor),
        recoveredCreditsAmount: Math.round(100000 * country.factor),
        recoveredCreditsTarget: 100000,
        avoidedContingenciesAmount: Math.round(70000 * country.factor),
        avoidedContingenciesTarget: 70000,
        taxSavingsOpportunityCount: country.factor >= 0.7 ? 1 : 0,
        taxSavingsAmount: Math.round(25000 * country.factor),
        feesPaid: 15000,
        totalValueGenerated: Math.round(150000 * country.factor),
        guidanceFailureAssessments: country.factor < 0.5 ? 1 : 0,
        unalertedOutOfAppetitePositions: country.factor < 0.6 ? 1 : 0,
        relevantLegalChanges: 5,
        proactivelyAlertedChanges: Math.round(5 * country.factor),
        repositoryCurrent: country.factor >= 0.6,
      });

      await this.indicators.createEtr(request, {
        countryCode: country.code,
        tier: country.tier,
        period: "2026-Q3",
        sourceCurrency: country.code === "BR" ? "BRL" : "USD",
        profitBeforeTax: 1000000 + index * 100000,
        currentTaxExpense: 160000 + index * 5000,
        deferredTaxExpense: 20000,
        pillarTwoTopUpTax: country.code === "KY" ? 30000 : 0,
        foreignExchangeEffect: country.code === "AR" ? 12000 : 2000,
        baselineEtrPercent: 22,
        targetEtrPercent: 19,
        optimizationImpact: -5000,
        legislativeImpact: 2000,
        contingencyImpact: 1000,
      });

      await this.indicators.createDemand(request, {
        countryCode: country.code,
        tier: country.tier,
        complexity: index % 2 === 0 ? "SIMPLE" : "COMPLEX",
        impact: country.tier === "TIER_1" ? "HIGH" : "LOW",
        urgency: index % 3 === 0 ? "URGENT" : "NOT_URGENT",
        status: "COMPLETED",
        receivedAt: "2026-08-01T08:00:00.000Z",
        completedAt:
          country.factor >= 0.7
            ? "2026-08-02T08:00:00.000Z"
            : "2026-08-08T08:00:00.000Z",
      });

      await this.indicators.createContingency(request, {
        countryCode: country.code,
        tier: country.tier,
        riskCategory: country.code === "VE" ? "SANCTIONS" : "TAX_LITIGATION",
        status: "OPEN",
        exposureAmountEur: 100000 + index * 50000,
        openedAt: "2026-02-01",
        inheritedBeforeBaseline: false,
        outsideRiskAppetite: country.factor < 0.6,
        ...(country.factor < 0.6
          ? {
              riskJustification:
                "Exceção sintética pendente de decisão formal.",
            }
          : {}),
      });

      await this.logistics.create(
        "operationalProfiles",
        request,
        {
          countryCode: country.code,
          operationTypes: ["FREIGHT_FORWARDING", "WAREHOUSING"],
          transportModes: ["ROAD", "MARITIME", "AIR"],
          operatingModel: "HYBRID",
          operationalPresence: "UNKNOWN",
          notes: "Dado exclusivamente sintético para demonstração.",
        },
        [country.code],
      );
    }

    const summary = {
      id: randomUUID(),
      tenantId: request.actor!.tenantId,
      scenario: "LATAM_CARIBBEAN_LOGISTICS_2026_Q3",
      jurisdictions: COUNTRIES.map(({ code, tier }) => ({ code, tier })),
      recordsCreated: 1 + COUNTRIES.length * 6,
      syntheticDataOnly: true,
      createdAt: new Date().toISOString(),
    };
    await this.repository.create("demoSeeds", summary);
    return { seeded: true, summary };
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
