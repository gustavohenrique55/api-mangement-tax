import {
  COUNTRY_GROUPS,
  type JurisdictionCatalogItem,
} from "../jurisdictions/country-groups";

/**
 * Política operacional, não prazo legal: por quanto tempo uma citação verificada
 * permanece confiável antes de exigir reconfirmação por advogado local. A
 * legislação muda no ritmo dela — isto apenas limita o quanto o nosso registro
 * pode envelhecer sem revisão.
 */
export const LEGAL_SOURCE_REVERIFICATION_DAYS = 365;

export const LEGAL_INSTRUMENT_TYPES = [
  "CONSTITUTION",
  "STATUTE",
  "COMPLEMENTARY_LAW",
  "DECREE",
  "REGULATION",
  "ADMINISTRATIVE_RULING",
  "TAX_TREATY",
  "SUPRANATIONAL_DIRECTIVE",
  "CASE_LAW",
  "OTHER",
] as const;
export type LegalInstrumentType = (typeof LEGAL_INSTRUMENT_TYPES)[number];

export const LEGAL_SOURCE_VERIFICATION_STATUSES = [
  "UNVERIFIED",
  "SOURCE_LINKED",
  "COUNSEL_CONFIRMED",
  "SUPERSEDED",
] as const;
export type LegalSourceVerificationStatus =
  (typeof LEGAL_SOURCE_VERIFICATION_STATUSES)[number];

export type LegalSourceStatus =
  | "MISSING"
  | "UNVERIFIED"
  | "VERIFIED"
  | "REVERIFICATION_DUE"
  | "NOT_YET_EFFECTIVE"
  | "SUPERSEDED";

export type JurisdictionAlignment =
  | "SAME_JURISDICTION"
  | "SOVEREIGN_FRAMEWORK"
  | "EU_FRAMEWORK_APPLICABLE"
  | "EU_FRAMEWORK_LIMITED"
  | "UNRELATED_JURISDICTION"
  | "UNKNOWN_JURISDICTION";

export interface LegalSourceInput {
  jurisdictionCode: string;
  subnationalCode?: string;
  instrumentType: LegalInstrumentType;
  instrument: string;
  article?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  officialUrl?: string;
  verificationStatus: LegalSourceVerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface LegalSourceAssessment {
  status: LegalSourceStatus;
  jurisdictionAlignment: JurisdictionAlignment;
  daysSinceVerification: number | null;
  reverificationDueInDays: number | null;
  warnings: string[];
  /**
   * Invariante do domínio: a citação é evidência auditável da origem da regra,
   * nunca subsunção. Nenhum campo derivado aqui conclui tratamento tributário.
   */
  concludesTreatment: false;
}

const CATALOG: ReadonlyMap<string, JurisdictionCatalogItem> = new Map(
  COUNTRY_GROUPS.flatMap((group) => [
    ...group.countries,
    ...group.territories,
  ]).map((item) => [item.countryCode, item] as const),
);

const DAY_MS = 86_400_000;

function daysBetween(from: number, to: number): number {
  return Math.floor((to - from) / DAY_MS);
}

function alignJurisdiction(
  recordCountryCode: string | null,
  sourceJurisdictionCode: string,
): JurisdictionAlignment {
  if (!recordCountryCode) return "UNKNOWN_JURISDICTION";
  if (recordCountryCode === sourceJurisdictionCode) return "SAME_JURISDICTION";

  const item = CATALOG.get(recordCountryCode);
  if (!item) return "UNKNOWN_JURISDICTION";

  if (item.sovereignAuthority?.countryCode === sourceJurisdictionCode) {
    return "SOVEREIGN_FRAMEWORK";
  }
  if (sourceJurisdictionCode === "EU") {
    // Regiões ultraperiféricas integram o território da UE; países e
    // territórios ultramarinos (PTU/OCT) estão fora do acervo aduaneiro e de
    // IVA, ainda que associados.
    if (item.supranationalFramework === "EU_OUTERMOST_REGION") {
      return "EU_FRAMEWORK_APPLICABLE";
    }
    if (item.supranationalFramework === "EU_OVERSEAS_ASSOCIATION") {
      return "EU_FRAMEWORK_LIMITED";
    }
  }
  return "UNRELATED_JURISDICTION";
}

export function assessLegalSource(
  source: LegalSourceInput | null,
  context: { countryCode: string | null; subnationalCode?: string | null },
  now: number = Date.now(),
): LegalSourceAssessment {
  if (!source) {
    return {
      status: "MISSING",
      jurisdictionAlignment: "UNKNOWN_JURISDICTION",
      daysSinceVerification: null,
      reverificationDueInDays: null,
      warnings: ["NO_LEGAL_SOURCE_CITED"],
      concludesTreatment: false,
    };
  }

  const jurisdictionAlignment = alignJurisdiction(
    context.countryCode,
    source.jurisdictionCode,
  );

  const verifiedAtMs = source.verifiedAt
    ? new Date(source.verifiedAt).getTime()
    : null;
  const verifiedAtValid =
    verifiedAtMs !== null && Number.isFinite(verifiedAtMs) ? verifiedAtMs : null;
  const daysSinceVerification =
    verifiedAtValid === null ? null : daysBetween(verifiedAtValid, now);
  const reverificationDueInDays =
    daysSinceVerification === null
      ? null
      : LEGAL_SOURCE_REVERIFICATION_DAYS - daysSinceVerification;

  const effectiveFromMs = new Date(source.effectiveFrom).getTime();
  const effectiveToMs = source.effectiveTo
    ? new Date(source.effectiveTo).getTime()
    : null;

  const status: LegalSourceStatus =
    source.verificationStatus === "SUPERSEDED" ||
    (effectiveToMs !== null && effectiveToMs < now)
      ? "SUPERSEDED"
      : Number.isFinite(effectiveFromMs) && effectiveFromMs > now
        ? "NOT_YET_EFFECTIVE"
        : source.verificationStatus !== "COUNSEL_CONFIRMED"
          ? "UNVERIFIED"
          : reverificationDueInDays === null || reverificationDueInDays < 0
            ? "REVERIFICATION_DUE"
            : "VERIFIED";

  const warnings: string[] = [];
  if (!source.officialUrl) warnings.push("MISSING_OFFICIAL_URL");
  if (!source.article) warnings.push("MISSING_ARTICLE_REFERENCE");
  if (source.verificationStatus === "COUNSEL_CONFIRMED" && !source.verifiedAt) {
    warnings.push("COUNSEL_CONFIRMED_WITHOUT_VERIFICATION_DATE");
  }
  if (context.subnationalCode && !source.subnationalCode) {
    warnings.push("SUBNATIONAL_RULE_CITES_NATIONAL_SOURCE");
  }
  if (jurisdictionAlignment === "UNRELATED_JURISDICTION") {
    warnings.push("SOURCE_JURISDICTION_NOT_LINKED_TO_RECORD");
  }
  if (jurisdictionAlignment === "EU_FRAMEWORK_LIMITED") {
    warnings.push("EU_ACQUIS_LIMITED_FOR_OVERSEAS_ASSOCIATION");
  }

  return {
    status,
    jurisdictionAlignment,
    daysSinceVerification,
    reverificationDueInDays,
    warnings,
    concludesTreatment: false,
  };
}
