import {
  IsArray,
  IsDateString,
  IsIn,
  IsISO31661Alpha2,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

export class CreateCfoConfigurationDto {
  @IsString() @Length(2, 40) version!: string;
  @IsDateString() effectiveFrom!: string;
  @IsDateString() baselineDate!: string;
  @Matches(/^[A-Z]{3}$/) reportingCurrency!: string;
  @Matches(/^[A-Z]{3}$/) complementaryCurrency!: string;
  @IsNumber() @Min(0) materialityAbsoluteEur!: number;
  @IsNumber() @Min(0) @Max(100) materialityEbitdaPercent!: number;
  @IsNumber() @Min(0) @Max(100) riskSuccessProbabilityThresholdPercent!: number;
  @IsNumber() @Min(0) maxUnprovisionedExposureEur!: number;
  @IsNumber() @Min(1) simpleSlaHours!: number;
  @IsNumber() @Min(1) complexSlaHours!: number;
  @IsObject() countryMaterialityWeights!: Record<string, number>;
  @IsIn(["DRAFT", "CFO_APPROVED", "BOARD_APPROVED"])
  approvalStatus!: string;
  @IsOptional() @IsString() @Length(2, 160) approvedBy?: string;
}

export class CreateTaxOfficeDto {
  @IsString() @Length(2, 40) officeCode!: string;
  @IsString() @Length(2, 160) anonymizedName!: string;
  @IsISO31661Alpha2() countryCode!: string;
  @IsIn(["TIER_1", "TIER_2", "TIER_3", "TIER_4", "TIER_5"])
  tier!: string;
  @IsIn(["CIVIL_LAW", "COMMON_LAW", "MIXED", "OTHER"])
  legalTradition!: string;
  @IsArray()
  @IsIn(
    ["COMPLIANCE", "LITIGATION", "ADVISORY", "CUSTOMS", "INTERNATIONAL_TAX"],
    {
      each: true,
    },
  )
  scope!: string[];
  @IsIn(["ACTIVE", "GAP", "PLANNED", "UNDER_REVIEW"])
  contractStatus!: string;
  @IsIn(["NONE", "COUNTRY_HUB", "REGIONAL_HUB"])
  hubRole!: string;
  @IsOptional() @IsString() @Length(2, 40) parentHubCode?: string;
  @IsIn(["FIXED", "HOURLY", "SUCCESS_FEE", "HYBRID"])
  feeModel!: string;
  @IsNumber() @Min(0) annualFeesEur!: number;
  @IsNumber() @Min(1) simpleSlaHours!: number;
  @IsNumber() @Min(1) complexSlaHours!: number;
  @IsIn(["CONFIRMED", "PENDING", "NOT_REQUIRED", "EXPIRED"])
  powerOfAttorneyStatus!: string;
  @IsIn(["QUARTERLY", "SEMIANNUAL"])
  scorecardCadence!: string;
  @IsIn(["DOCUMENTED", "PENDING_REVIEW", "NOT_APPLICABLE"])
  privilegeProtocol!: string;
  @IsIn(["PRELIMINARY", "PENDING_LOCAL_COUNSEL", "VALIDATED"])
  legalValidationStatus!: string;
}
