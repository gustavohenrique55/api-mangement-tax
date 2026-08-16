import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsISO31661Alpha2,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
} from "class-validator";
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
}

export class CreateTaxRuleDto {
  @IsISO31661Alpha2() countryCode!: string;
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
  @IsOptional() @IsNumber() @Min(0) ratePercent?: number;
  @IsString() @Length(2, 500) applicabilitySummary!: string;
  @IsIn(LEGAL_VALIDATION_STATUSES)
  legalValidationStatus!: LegalValidationStatus;
  @IsString() @Length(3, 500) sourceReference!: string;
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
      "CONTRACT_AUTHORITY",
      "EMPLOYEES",
      "DEDICATED_FLEET",
      "SERVICE_DURATION",
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
