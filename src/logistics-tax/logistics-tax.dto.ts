import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsISO31661Alpha2,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  LEGAL_INSTRUMENT_TYPES,
  LEGAL_SOURCE_VERIFICATION_STATUSES,
  type LegalInstrumentType,
  type LegalSourceVerificationStatus,
} from "./legal-source";
import {
  LEGAL_VALIDATION_STATUSES,
  OPERATION_TYPES,
  RECOVERY_STATUSES,
  TRANSPORT_MODES,
  type LegalValidationStatus,
  type OperationType,
  type RecoveryStatus,
  type TransportMode,
} from "./logistics-tax.types";

/**
 * Citação da norma que fundamenta o registro. Substitui o texto livre de
 * `sourceReference` por campos auditáveis — sem que a plataforma passe a
 * concluir tratamento tributário: a norma é rastreada, não interpretada.
 */
export class LegalSourceDto {
  /** ISO 3166-1 alpha-2 ou "EU" para instrumento supranacional. */
  @Matches(/^([A-Z]{2})$/) jurisdictionCode!: string;
  @IsOptional() @IsString() @Matches(/^[A-Z0-9-]{1,10}$/) subnationalCode?: string;
  @IsIn(LEGAL_INSTRUMENT_TYPES) instrumentType!: LegalInstrumentType;
  @IsString() @Length(3, 200) instrument!: string;
  @IsOptional() @IsString() @Length(1, 120) article?: string;
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
  @IsOptional() @IsUrl({ protocols: ["https"], require_protocol: true })
  officialUrl?: string;
  @IsIn(LEGAL_SOURCE_VERIFICATION_STATUSES)
  verificationStatus!: LegalSourceVerificationStatus;
  @IsOptional() @IsDateString() verifiedAt?: string;
  @IsOptional() @IsString() @Length(2, 160) verifiedBy?: string;
}

export class CreateOperationalProfileDto {
  @IsISO31661Alpha2() countryCode!: string;
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(OPERATION_TYPES, { each: true })
  operationTypes!: OperationType[];
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(TRANSPORT_MODES, { each: true })
  transportModes!: TransportMode[];
  @IsIn(["OWNED", "OUTSOURCED", "HYBRID"]) operatingModel!:
    "OWNED" | "OUTSOURCED" | "HYBRID";
  @IsIn(["UNKNOWN", "CONFIRMED", "NOT_PRESENT"]) operationalPresence!:
    "UNKNOWN" | "CONFIRMED" | "NOT_PRESENT";
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class CreateLegalEntityDto {
  @IsISO31661Alpha2() countryCode!: string;
  @IsString() @Length(2, 160) displayName!: string;
  @IsString() @Length(3, 64) taxIdentifierMasked!: string;
  @IsIn([
    "CORPORATION",
    "BRANCH",
    "PARTNERSHIP",
    "REPRESENTATIVE_OFFICE",
    "OTHER",
  ])
  entityType!: string;
  @Matches(/^[A-Z]{3}$/) functionalCurrency!: string;
  @IsIn(["ACTIVE", "INACTIVE", "PLANNED"]) status!: string;
}

export class CreateEstablishmentDto {
  @IsUUID() legalEntityId!: string;
  @IsISO31661Alpha2() countryCode!: string;
  @IsString() @Length(2, 160) displayName!: string;
  @IsIn([
    "OFFICE",
    "WAREHOUSE",
    "TERMINAL",
    "PORT",
    "AIRPORT",
    "DEPOT",
    "OTHER",
  ])
  establishmentType!: string;
  @IsString() @Length(2, 160) city!: string;
  @IsIn(["OWNED", "LEASED", "THIRD_PARTY"]) controlModel!: string;
}

export class CreateLogisticsLaneDto {
  @IsISO31661Alpha2() originCountryCode!: string;
  @IsISO31661Alpha2() destinationCountryCode!: string;
  @IsIn(TRANSPORT_MODES) transportMode!: TransportMode;
  @IsOptional() @IsUUID() billingEntityId?: string;
  @IsOptional() @IsString() @Length(3, 16) incoterm?: string;
  @Matches(/^[A-Z]{3}$/) currency!: string;
  @IsIn(["ACTIVE", "INACTIVE", "PLANNED"]) status!: string;
}

export class CreateCustomsRegimeDto {
  @IsISO31661Alpha2() countryCode!: string;
  @IsString() @Length(2, 40) code!: string;
  @IsString() @Length(2, 160) name!: string;
  @IsIn([
    "SUSPENSIVE",
    "FREE_ZONE",
    "TEMPORARY_ADMISSION",
    "BONDED_WAREHOUSE",
    "TRANSIT",
    "DRAWBACK",
    "OTHER",
  ])
  regimeType!: string;
  @IsIn(LEGAL_VALIDATION_STATUSES)
  legalValidationStatus!: LegalValidationStatus;
  @IsOptional() @IsString() @MaxLength(500) sourceReference?: string;
  @IsOptional() @ValidateNested() @Type(() => LegalSourceDto)
  legalSource?: LegalSourceDto;
}

export class CreateTaxRuleDto {
  @IsISO31661Alpha2() countryCode!: string;
  @IsOptional() @IsString() @Matches(/^[A-Z0-9-]{1,10}$/) subnationalCode?: string;
  @IsOptional()
  @IsIn([
    "STANDARD_VAT",
    "LEGACY_ICMS_ISS",
    "IBS_CBS_TRANSITION",
    "IBS_CBS",
    "SUBNATIONAL_TURNOVER",
    "OTHER",
  ])
  taxSystemRegime?: string;
  @IsIn([
    "CORPORATE_INCOME",
    "VAT_GST",
    "WITHHOLDING",
    "CUSTOMS_DUTY",
    "PAYROLL",
    "FUEL",
    "PROPERTY_FLEET",
    "MUNICIPAL",
    "ENVIRONMENTAL",
    "OTHER",
  ])
  taxType!: string;
  @IsIn(OPERATION_TYPES) operationType!: OperationType;
  @IsOptional()
  @IsIn(["FEDERAL", "STATE_PROVINCIAL", "MUNICIPAL", "SUPRANATIONAL"])
  taxLevel?: string;
  @IsOptional()
  @IsIn([
    "IVA",
    "ICMS",
    "ISS",
    "IPI",
    "PIS_COFINS",
    "IBS",
    "CBS",
    "INGRESOS_BRUTOS",
    "ISC_EXCISE",
    "GST",
    "SALES_TAX",
    "OTHER",
  ])
  indirectTaxSubtype?: string;
  @IsOptional()
  @IsIn(["NON_CUMULATIVE", "CUMULATIVE", "PARTIAL", "NON_CREDITABLE"])
  creditRegime?: string;
  @IsOptional()
  @IsIn(["STANDARD", "REDUCED", "ZERO_RATED", "EXEMPT", "INTERSTATE"])
  rateType?: string;
  @IsOptional()
  @IsIn(["TAX_INCLUSIVE", "TAX_EXCLUSIVE"])
  calculationBasis?: string;
  @IsOptional()
  @IsIn(["STANDARD", "WITHHOLDING", "TAX_SUBSTITUTION", "REVERSE_CHARGE"])
  collectionMechanism?: string;
  @IsOptional() @IsNumber() @Min(0) ratePercent?: number;
  @IsString() @Length(2, 500) applicabilitySummary!: string;
  @IsIn(LEGAL_VALIDATION_STATUSES)
  legalValidationStatus!: LegalValidationStatus;
  @IsString() @Length(3, 500) sourceReference!: string;
  @IsOptional() @ValidateNested() @Type(() => LegalSourceDto)
  legalSource?: LegalSourceDto;
}

export class CreateTaxDocumentDto {
  @IsISO31661Alpha2() countryCode!: string;
  @IsIn([
    "INVOICE",
    "TRANSPORT_DOCUMENT",
    "BILL_OF_LADING",
    "AIR_WAYBILL",
    "CARGO_MANIFEST",
    "IMPORT_DECLARATION",
    "EXPORT_DECLARATION",
    "ORIGIN_CERTIFICATE",
    "CUSTOMS_TRANSIT",
    "WAREHOUSE_RECEIPT",
    "TAX_PAYMENT",
    "OTHER",
  ])
  documentType!: string;
  @IsString() @Length(3, 160) externalReference!: string;
  @IsDateString() issueDate!: string;
  @IsOptional() @IsUUID() legalEntityId?: string;
  @IsIn(["INTERNAL", "CONFIDENTIAL", "RESTRICTED"]) informationClass!: string;
}

export class CreateTaxRecoveryOpportunityDto {
  @IsISO31661Alpha2() countryCode!: string;
  @IsOptional() @IsUUID() legalEntityId?: string;
  @IsIn(["OPERATIONAL", "EXTRAORDINARY"]) creditCategory!: string;
  @IsIn([
    "VAT_GST",
    "FREIGHT",
    "FUEL",
    "IMPORT_DUTY",
    "WITHHOLDING",
    "OVERPAYMENT",
    "INCENTIVE",
    "OTHER",
  ])
  taxType!: string;
  @IsString() @Length(2, 40) taxPeriod!: string;
  @IsNumber() @Min(0) identifiedAmount!: number;
  @Matches(/^[A-Z]{3}$/) currency!: string;
  @IsDateString() statutoryDeadline!: string;
  @IsIn([
    "OFFSET",
    "REFUND",
    "REIMBURSEMENT",
    "ADMINISTRATIVE_CLAIM",
    "JUDICIAL_CLAIM",
  ])
  recoveryChannel!: string;
  @IsIn(RECOVERY_STATUSES) status!: RecoveryStatus;
  @IsIn(LEGAL_VALIDATION_STATUSES)
  legalValidationStatus!: LegalValidationStatus;
}

export class CreatePermanentEstablishmentAssessmentDto {
  @IsISO31661Alpha2() hostCountryCode!: string;
  @IsOptional() @IsUUID() legalEntityId?: string;
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(
    [
      "FIXED_PLACE",
      "WAREHOUSE",
      "DEPENDENT_AGENT",
      "INDEPENDENT_AGENT",
      "CONTRACT_AUTHORITY",
      "EMPLOYEES",
      "DEDICATED_FLEET",
      "SERVICE_DURATION",
      "SERVICE_183_DAYS",
      "LOCAL_DECISION_MAKING",
    ],
    { each: true },
  )
  riskFactors!: string[];
  @IsIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"]) riskLevel!: string;
  @IsIn(LEGAL_VALIDATION_STATUSES)
  legalValidationStatus!: LegalValidationStatus;
  @IsString() @Length(2, 1000) preliminaryRationale!: string;
}

export class CreateIntegrationConnectionDto {
  @IsIn(["ERP", "TMS", "WMS", "CUSTOMS", "LITIGATION", "LOCAL_COUNSEL"])
  systemType!: string;
  @IsString() @Length(2, 120) displayName!: string;
  @IsIn(["INBOUND", "OUTBOUND", "BIDIRECTIONAL"]) direction!: string;
  @IsIn(["PLANNED", "DISABLED", "ACTIVE", "ERROR"]) status!: string;
  @IsString() @Length(3, 160) secretReference!: string;
}

export class CreateComplianceObligationDto {
  @IsISO31661Alpha2() countryCode!: string;
  @IsOptional() @IsUUID() legalEntityId?: string;
  @IsIn([
    "CBCR",
    "TP_DOCUMENTATION",
    "FATCA",
    "CRS",
    "ECONOMIC_SUBSTANCE",
    "MDR",
    "DAC6",
    "E_INVOICING",
    "OTHER",
  ])
  regime!: string;
  @IsIn(["ANNUAL", "QUARTERLY", "MONTHLY", "EVENT_DRIVEN", "ONE_OFF"])
  filingFrequency!: string;
  @IsIn([
    "NOT_APPLICABLE",
    "PENDING_ASSESSMENT",
    "IN_PREPARATION",
    "FILED",
    "OVERDUE",
    "EXEMPT",
  ])
  status!: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsIn(LEGAL_VALIDATION_STATUSES)
  legalValidationStatus!: LegalValidationStatus;
  @IsString() @Length(3, 500) sourceReference!: string;
  @IsOptional() @ValidateNested() @Type(() => LegalSourceDto)
  legalSource?: LegalSourceDto;
}
