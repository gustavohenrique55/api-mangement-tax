import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { ManagementRecordRepository } from "../database/management-record.repository";
import type {
  CreateEtrMeasurementDto,
  CreateOfficeScorecardDto,
  CreateTaxContingencyDto,
  CreateTaxDemandDto,
} from "./indicators.dto";

type IndicatorRecord = Record<string, unknown> & {
  id: string;
  tenantId: string;
  createdAt: string;
};

const WEIGHTS = {
  disputeSuccessRate: 15,
  opinionReworkRate: 10,
  responseTime: 10,
  deadlineCompliance: 10,
  recoveredCredits: 15,
  avoidedContingencies: 10,
  taxSavings: 5,
  costBenefit: 10,
  guidanceFailures: 5,
  riskAppetiteAdherence: 5,
  legislativeMonitoring: 5,
} as const;

@Injectable()
export class IndicatorsService {
  constructor(private readonly repository: ManagementRecordRepository) {}

  createScorecard(request: Request, input: CreateOfficeScorecardDto) {
    this.assertCounts(
      input.favorableDisputes,
      input.closedDisputes,
      "disputes",
    );
    this.assertCounts(
      input.opinionsReturnedForCorrection,
      input.opinionsIssued,
      "opinions",
    );
    this.assertCounts(
      input.obligationsOnTime,
      input.obligationsTotal,
      "obligations",
    );
    this.assertCounts(
      input.proactivelyAlertedChanges,
      input.relevantLegalChanges,
      "legal changes",
    );

    const raw = {
      disputeSuccessRate: ratio(input.favorableDisputes, input.closedDisputes),
      opinionReworkRate: ratio(
        input.opinionsReturnedForCorrection,
        input.opinionsIssued,
      ),
      averageSimpleResponseDays: input.averageSimpleResponseDays,
      averageComplexResponseDays: input.averageComplexResponseDays,
      deadlineCompliance: ratio(
        input.obligationsOnTime,
        input.obligationsTotal,
      ),
      recoveredCreditsPerformance: ratio(
        input.recoveredCreditsAmount,
        input.recoveredCreditsTarget,
      ),
      avoidedContingenciesPerformance: ratio(
        input.avoidedContingenciesAmount,
        input.avoidedContingenciesTarget,
      ),
      costBenefitRatio:
        input.totalValueGenerated === 0
          ? input.feesPaid === 0
            ? 0
            : Number.POSITIVE_INFINITY
          : round(input.feesPaid / input.totalValueGenerated),
      legislativeAlertRate: ratio(
        input.proactivelyAlertedChanges,
        input.relevantLegalChanges,
      ),
    };
    const responseTimeScore =
      (lowerBetter(input.averageSimpleResponseDays, 5) +
        lowerBetter(input.averageComplexResponseDays, 15)) /
      2;
    const scores = {
      disputeSuccessRate: higherBetter(raw.disputeSuccessRate, 70),
      opinionReworkRate: lowerBetter(raw.opinionReworkRate, 5),
      responseTime: responseTimeScore,
      deadlineCompliance: higherBetter(raw.deadlineCompliance, 100),
      recoveredCredits: higherBetter(raw.recoveredCreditsPerformance, 100),
      avoidedContingencies: higherBetter(
        raw.avoidedContingenciesPerformance,
        100,
      ),
      taxSavings: higherBetter(input.taxSavingsOpportunityCount, 1),
      costBenefit: lowerBetter(raw.costBenefitRatio, 0.15),
      guidanceFailures: zeroTarget(input.guidanceFailureAssessments),
      riskAppetiteAdherence: zeroTarget(input.unalertedOutOfAppetitePositions),
      legislativeMonitoring:
        higherBetter(raw.legislativeAlertRate, 100) *
        (input.repositoryCurrent ? 1 : 0),
    };
    const ide = round(
      Object.entries(WEIGHTS).reduce(
        (total, [key, weight]) =>
          total + scores[key as keyof typeof scores] * (weight / 100),
        0,
      ),
    );
    const classification = classifyIde(ide);
    return this.store(
      "officeScorecards",
      request,
      {
        ...input,
        rawIndicators: raw,
        normalizedScores: scores,
        weights: WEIGHTS,
        ide,
        classification,
        reviewCadence:
          ["TIER_1", "TIER_2"].includes(input.tier) ||
          ["ATTENTION", "CRITICAL"].includes(classification.code)
            ? "QUARTERLY"
            : "SEMIANNUAL",
        panelReviewAllowed: input.calibrationStatus === "CALIBRATED",
        action: classification.action,
      },
      [input.countryCode],
    );
  }

  createEtr(request: Request, input: CreateEtrMeasurementDto) {
    const taxBeforePillarTwo =
      input.currentTaxExpense + input.deferredTaxExpense;
    const totalTaxExpense = taxBeforePillarTwo + input.pillarTwoTopUpTax;
    const lossPeriod = input.profitBeforeTax <= 0;
    // ETR percentages are not meaningful for a loss period.
    const pct = (value: number): number | null =>
      lossPeriod ? null : percentage(value, input.profitBeforeTax);
    const effectiveTaxRate = pct(totalTaxExpense);
    const globeRegimeStatus = input.globeRegimeStatus ?? "NOT_ENACTED";
    return this.store(
      "etrMeasurements",
      request,
      {
        ...input,
        reportingCurrency: "EUR",
        complementaryCurrency: "USD",
        lossPeriod,
        taxBeforePillarTwo,
        totalTaxExpense,
        etrBeforePillarTwo: pct(taxBeforePillarTwo),
        effectiveTaxRate,
        accountingEtr: effectiveTaxRate,
        etrBasis: "ACCOUNTING_BOOK",
        globeRegimeStatus,
        globeEtrStatus:
          globeRegimeStatus === "NOT_ENACTED"
            ? "OUT_OF_SCOPE_LOCAL_REGIME"
            : "REQUIRES_GLOBE_COMPUTATION",
        globeEtrNote:
          "ETR contábil (livro), distinta da ETR jurisdicional GloBE (impostos abrangidos ajustados sobre o lucro GloBE, com blending jurisdicional e piso de 15%), que exige cálculo próprio.",
        etrExcludingForeignExchange: lossPeriod
          ? null
          : percentage(
              totalTaxExpense - input.foreignExchangeEffect,
              input.profitBeforeTax,
            ),
        variationFromBaseline:
          effectiveTaxRate === null
            ? null
            : round(effectiveTaxRate - input.baselineEtrPercent),
        gapToTarget:
          effectiveTaxRate === null
            ? null
            : round(effectiveTaxRate - input.targetEtrPercent),
        pillarTwoNeutralization: pct(input.pillarTwoTopUpTax),
      },
      [input.countryCode],
    );
  }

  createDemand(request: Request, input: CreateTaxDemandDto) {
    const end = input.completedAt ? new Date(input.completedAt) : new Date();
    const elapsedHours = Math.max(
      0,
      (end.getTime() - new Date(input.receivedAt).getTime()) / 3_600_000,
    );
    const slaTargetHours = input.complexity === "SIMPLE" ? 48 : 120;
    return this.store(
      "taxDemands",
      request,
      {
        ...input,
        elapsedHours: round(elapsedHours),
        slaTargetHours,
        slaStatus:
          input.status !== "COMPLETED"
            ? elapsedHours > slaTargetHours
              ? "OVERDUE"
              : "OPEN_WITHIN_SLA"
            : elapsedHours <= slaTargetHours
              ? "MET"
              : "BREACHED",
        priority:
          input.impact === "HIGH" && input.urgency === "URGENT"
            ? "IMMEDIATE"
            : input.urgency === "URGENT"
              ? "DELEGATE_FAST"
              : input.impact === "HIGH"
                ? "NEXT_CYCLE"
                : "BACKLOG",
      },
      [input.countryCode],
    );
  }

  createContingency(request: Request, input: CreateTaxContingencyDto) {
    if (input.outsideRiskAppetite && !input.riskJustification)
      throw new BadRequestException(
        "riskJustification is required outside the approved risk appetite",
      );
    const end = input.closedAt ? new Date(input.closedAt) : new Date();
    const agingDays = Math.max(
      0,
      Math.floor(
        (end.getTime() - new Date(input.openedAt).getTime()) / 86_400_000,
      ),
    );
    return this.store("taxContingencies", request, { ...input, agingDays }, [
      input.countryCode,
    ]);
  }

  list(resourceType: string, request: Request) {
    return this.repository.list(resourceType, request.actor!.tenantId);
  }

  async dashboard(request: Request, period?: string) {
    const tenantId = request.actor!.tenantId;
    const [allScorecards, allEtr, demands, allContingencies] =
      await Promise.all([
        this.repository.list("officeScorecards", tenantId),
        this.repository.list("etrMeasurements", tenantId),
        this.repository.list("taxDemands", tenantId),
        this.repository.list("taxContingencies", tenantId),
      ]);
    const scorecards = allScorecards.filter(
      (item) => !period || item.period === period,
    );
    const etr = allEtr.filter((item) => !period || item.period === period);
    const contingencies = allContingencies.filter(
      (item) => item.status === "OPEN",
    );
    const activeContingencies = contingencies.filter(
      (item) => item.inheritedBeforeBaseline === false,
    );
    return {
      period: period ?? "ALL",
      generatedAt: new Date().toISOString(),
      scorecard: {
        officeCount: scorecards.length,
        averageIde: average(scorecards.map((item) => Number(item.ide))),
        weightedAverageIde: null,
        weightingStatus: "PENDING_CFO_MATERIALITY_PARAMETERS",
        byClassification: countBy(scorecards, "classification", "code"),
      },
      etr: {
        measurementCount: etr.length,
        averageEffectiveTaxRate: average(
          etr.map((item) => Number(item.effectiveTaxRate)),
        ),
        consolidatedEffectiveTaxRate: percentageOrZero(
          sum(etr, "totalTaxExpense"),
          sum(etr, "profitBeforeTax"),
        ),
        pillarTwoTopUpTax: sum(etr, "pillarTwoTopUpTax"),
      },
      financialResults: {
        recoveredCreditsAmount: sum(scorecards, "recoveredCreditsAmount"),
        recoveredCreditsTarget: sum(scorecards, "recoveredCreditsTarget"),
        avoidedContingenciesAmount: sum(
          scorecards,
          "avoidedContingenciesAmount",
        ),
        taxSavingsAmount: sum(scorecards, "taxSavingsAmount"),
      },
      sla: {
        openDemands: demands.filter((item) => item.status !== "COMPLETED")
          .length,
        averageResolutionHours: average(
          demands
            .filter((item) => item.status === "COMPLETED")
            .map((item) => Number(item.elapsedHours)),
        ),
        complianceRate: ratio(
          demands.filter((item) => item.slaStatus === "MET").length,
          demands.filter((item) => item.status === "COMPLETED").length,
        ),
      },
      risk: {
        openContingencies: activeContingencies.length,
        inheritedOpenContingencies:
          contingencies.length - activeContingencies.length,
        exposureAmountEur: sum(activeContingencies, "exposureAmountEur"),
        averageAgingDays: average(
          activeContingencies.map((item) => Number(item.agingDays)),
        ),
        outsideRiskAppetite: activeContingencies.filter(
          (item) => item.outsideRiskAppetite === true,
        ).length,
        byTier: countBy(activeContingencies, "tier"),
        byCategory: countBy(activeContingencies, "riskCategory"),
      },
      governanceNotice:
        "Parameters are initial benchmarks and must be calibrated after the first complete quarter. Legal conclusions remain with qualified local counsel.",
    };
  }

  private store(
    resourceType: string,
    request: Request,
    value: Record<string, unknown>,
    countryCodes: string[],
  ) {
    const record = {
      id: randomUUID(),
      tenantId: request.actor!.tenantId,
      ...value,
      createdAt: new Date().toISOString(),
    };
    return this.repository.create(resourceType, record, countryCodes);
  }

  private assertCounts(part: number, total: number, name: string) {
    if (part > total)
      throw new BadRequestException(`${name}: numerator cannot exceed total`);
  }
}

function ratio(value: number, total: number) {
  return total === 0 ? 0 : round((value / total) * 100);
}
function percentage(value: number, base: number) {
  return round((value / base) * 100);
}
function percentageOrZero(value: number, base: number) {
  return base === 0 ? 0 : percentage(value, base);
}
function higherBetter(actual: number, target: number) {
  return target === 0
    ? zeroTarget(actual)
    : round(Math.min(100, (actual / target) * 100));
}
function lowerBetter(actual: number, target: number) {
  if (actual === 0) return 100;
  if (target === 0) return 0;
  return round(Math.min(100, (target / actual) * 100));
}
function zeroTarget(actual: number) {
  return actual === 0 ? 100 : 0;
}
function round(value: number) {
  return Math.round(value * 100) / 100;
}
function average(values: number[]) {
  return values.length
    ? round(values.reduce((a, b) => a + b, 0) / values.length)
    : 0;
}
function sum(items: IndicatorRecord[], key: string) {
  return round(
    items.reduce((total, item) => total + Number(item[key] ?? 0), 0),
  );
}
function countBy(items: IndicatorRecord[], key: string, nested?: string) {
  return items.reduce<Record<string, number>>((result, item) => {
    const raw = nested
      ? (item[key] as Record<string, unknown> | undefined)?.[nested]
      : item[key];
    const value = String(raw ?? "UNKNOWN");
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}
function classifyIde(ide: number) {
  if (ide >= 85)
    return {
      code: "EXCELLENT",
      label: "Excelente",
      action: "REGIONAL_REFERENCE",
    };
  if (ide >= 70)
    return { code: "GOOD", label: "Bom", action: "STANDARD_MONITORING" };
  if (ide >= 50)
    return {
      code: "ATTENTION",
      label: "Atenção",
      action: "FORMAL_IMPROVEMENT_PLAN",
    };
  return {
    code: "CRITICAL",
    label: "Crítico",
    action: "IMMEDIATE_PANEL_REVIEW",
  };
}
