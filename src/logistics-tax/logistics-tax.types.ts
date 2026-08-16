export const OPERATION_TYPES = [
  "ROAD_TRANSPORT",
  "MARITIME_TRANSPORT",
  "AIR_TRANSPORT",
  "RAIL_TRANSPORT",
  "WAREHOUSING",
  "FREIGHT_FORWARDING",
  "CUSTOMS_BROKERAGE",
  "PORT_OPERATION",
  "AIRPORT_OPERATION",
  "LAST_MILE",
  "CROSS_DOCKING",
  "REVERSE_LOGISTICS",
  "FLEET_MANAGEMENT",
] as const;

export const TRANSPORT_MODES = [
  "ROAD",
  "MARITIME",
  "AIR",
  "RAIL",
  "MULTIMODAL",
] as const;
export const LEGAL_VALIDATION_STATUSES = [
  "PRELIMINARY",
  "PENDING_LOCAL_COUNSEL",
  "VALIDATED",
  "SUPERSEDED",
] as const;
export const RECOVERY_STATUSES = [
  "IDENTIFIED",
  "UNDER_REVIEW",
  "PENDING_LOCAL_COUNSEL",
  "VALIDATED",
  "REJECTED",
  "APPROVED",
  "FILED",
  "UNDER_TAX_AUTHORITY_REVIEW",
  "GRANTED",
  "PARTIALLY_GRANTED",
  "DENIED",
  "MONETIZED",
  "EXPIRED",
] as const;

export type OperationType = (typeof OPERATION_TYPES)[number];
export type TransportMode = (typeof TRANSPORT_MODES)[number];
export type LegalValidationStatus = (typeof LEGAL_VALIDATION_STATUSES)[number];
export type RecoveryStatus = (typeof RECOVERY_STATUSES)[number];

export interface DomainRecord {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}
