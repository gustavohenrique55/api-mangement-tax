import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsISO31661Alpha2,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from "class-validator";

const TIERS = ["TIER_1", "TIER_2", "TIER_3", "TIER_4", "TIER_5"] as const;

export class CreateOfficeScorecardDto {
  @IsString() @Length(2, 160) officeName!: string;
  @IsISO31661Alpha2() countryCode!: string;
  @IsIn(TIERS) tier!: string;
  @Matches(/^\d{4}-Q[1-4]$/) period!: string;
  @IsIn(["BASELINE", "CALIBRATED"]) calibrationStatus!: string;
  @IsInt() @Min(0) closedDisputes!: number;
  @IsInt() @Min(0) favorableDisputes!: number;
  @IsInt() @Min(0) opinionsIssued!: number;
  @IsInt() @Min(0) opinionsReturnedForCorrection!: number;
  @IsNumber() @Min(0) averageSimpleResponseDays!: number;
  @IsNumber() @Min(0) averageComplexResponseDays!: number;
  @IsInt() @Min(0) obligationsTotal!: number;
  @IsInt() @Min(0) obligationsOnTime!: number;
  @IsNumber() @Min(0) recoveredCreditsAmount!: number;
  @IsNumber() @Min(0) recoveredCreditsTarget!: number;
  @IsNumber() @Min(0) avoidedContingenciesAmount!: number;
  @IsNumber() @Min(0) avoidedContingenciesTarget!: number;
  @IsInt() @Min(0) taxSavingsOpportunityCount!: number;
  @IsNumber() @Min(0) taxSavingsAmount!: number;
  @IsNumber() @Min(0) feesPaid!: number;
  @IsNumber() @Min(0) totalValueGenerated!: number;
  @IsInt() @Min(0) guidanceFailureAssessments!: number;
  @IsInt() @Min(0) unalertedOutOfAppetitePositions!: number;
  @IsInt() @Min(0) relevantLegalChanges!: number;
  @IsInt() @Min(0) proactivelyAlertedChanges!: number;
  @IsBoolean() repositoryCurrent!: boolean;
}

export class CreateEtrMeasurementDto {
  @IsISO31661Alpha2() countryCode!: string;
  @IsIn(TIERS) tier!: string;
  @Matches(/^\d{4}-Q[1-4]$/) period!: string;
  @Matches(/^[A-Z]{3}$/) sourceCurrency!: string;
  @IsNumber() profitBeforeTax!: number;
  @IsNumber() currentTaxExpense!: number;
  @IsNumber() deferredTaxExpense!: number;
  @IsNumber() @Min(0) pillarTwoTopUpTax!: number;
  @IsNumber() foreignExchangeEffect!: number;
  @IsNumber() baselineEtrPercent!: number;
  @IsNumber() targetEtrPercent!: number;
  @IsOptional()
  @IsIn(["NOT_ENACTED", "QDMTT", "IIR", "UTPR", "IIR_AND_QDMTT", "FULL_GLOBE"])
  globeRegimeStatus?: string;
  @IsOptional() @IsNumber() optimizationImpact?: number;
  @IsOptional() @IsNumber() legislativeImpact?: number;
  @IsOptional() @IsNumber() contingencyImpact?: number;
}

export class CreateTaxDemandDto {
  @IsISO31661Alpha2() countryCode!: string;
  @IsIn(TIERS) tier!: string;
  @IsIn(["SIMPLE", "COMPLEX"]) complexity!: string;
  @IsIn(["LOW", "HIGH"]) impact!: string;
  @IsIn(["URGENT", "NOT_URGENT"]) urgency!: string;
  @IsIn(["BACKLOG", "TRIAGE", "IN_PROGRESS", "VALIDATION", "COMPLETED"])
  status!: string;
  @IsDateString() receivedAt!: string;
  @IsOptional() @IsDateString() completedAt?: string;
}

export class CreateTaxContingencyDto {
  @IsISO31661Alpha2() countryCode!: string;
  @IsIn(TIERS) tier!: string;
  @IsIn([
    "FILING_COMPLIANCE",
    "TRANSFER_PRICING_SUBSTANCE",
    "FX_REPATRIATION",
    "PILLAR_TWO",
    "REPUTATIONAL",
    "SANCTIONS",
    "PERMANENT_ESTABLISHMENT",
    "TAX_LITIGATION",
  ])
  riskCategory!: string;
  @IsIn(["OPEN", "CLOSED"]) status!: string;
  @IsNumber() @Min(0) exposureAmountEur!: number;
  @IsDateString() openedAt!: string;
  @IsOptional() @IsDateString() closedAt?: string;
  @IsBoolean() inheritedBeforeBaseline!: boolean;
  @IsBoolean() outsideRiskAppetite!: boolean;
  @IsOptional() @IsString() @Length(2, 1000) riskJustification?: string;
}
