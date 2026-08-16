export const MANAGEMENT_BLOCKS = [
  "CENTRAL_AMERICA",
  "CARIBBEAN_ISLANDS",
  "SOUTH_AMERICA",
] as const;
export type ManagementBlock = (typeof MANAGEMENT_BLOCKS)[number];

export const JURISDICTION_TYPES = [
  "SOVEREIGN_STATE",
  "NON_SOVEREIGN_TERRITORY",
  "CONSTITUENT_COUNTRY",
  "OVERSEAS_TERRITORY",
  "OVERSEAS_REGION",
] as const;
export type JurisdictionType = (typeof JURISDICTION_TYPES)[number];

export interface SovereignAuthority {
  countryCode: string;
  name: string;
}

export interface JurisdictionCatalogItem {
  countryCode: string;
  name: string;
  jurisdictionType: JurisdictionType;
  sovereignAuthority: SovereignAuthority | null;
  applicableLawModel:
    "SOVEREIGN_DOMESTIC_LAW" | "TERRITORY_SPECIFIC_WITH_SOVEREIGN_FRAMEWORK";
  legalValidationStatus: "REQUIRED_LOCAL_COUNSEL";
  legalFrameworkNote?: string;
  tierReference: 1 | 2 | 3 | 4 | 5 | null;
  documentaryBasis:
    "EXPLICITLY_NAMED" | "AGGREGATE_REFERENCE" | "REGIONAL_CATALOG";
  operationalPresence: "UNCONFIRMED";
}

export interface CountryGroup {
  code: ManagementBlock;
  name: string;
  coverageStatus: "DOCUMENTED_REFERENCE" | "PENDING_CONFIRMATION";
  classificationNote?: string;
  countries: JurisdictionCatalogItem[];
  territories: JurisdictionCatalogItem[];
}

const country = (
  countryCode: string,
  name: string,
  tierReference: JurisdictionCatalogItem["tierReference"],
  documentaryBasis: JurisdictionCatalogItem["documentaryBasis"] = "EXPLICITLY_NAMED",
): JurisdictionCatalogItem => ({
  countryCode,
  name,
  jurisdictionType: "SOVEREIGN_STATE",
  sovereignAuthority: null,
  applicableLawModel: "SOVEREIGN_DOMESTIC_LAW",
  legalValidationStatus: "REQUIRED_LOCAL_COUNSEL",
  tierReference,
  documentaryBasis,
  operationalPresence: "UNCONFIRMED",
});

const territory = (
  countryCode: string,
  name: string,
  jurisdictionType: Exclude<JurisdictionType, "SOVEREIGN_STATE">,
  sovereignAuthority: SovereignAuthority,
  legalFrameworkNote: string,
): JurisdictionCatalogItem => ({
  countryCode,
  name,
  jurisdictionType,
  sovereignAuthority,
  applicableLawModel: "TERRITORY_SPECIFIC_WITH_SOVEREIGN_FRAMEWORK",
  legalValidationStatus: "REQUIRED_LOCAL_COUNSEL",
  legalFrameworkNote,
  tierReference: null,
  documentaryBasis: "REGIONAL_CATALOG",
  operationalPresence: "UNCONFIRMED",
});

export const COUNTRY_GROUPS: CountryGroup[] = [
  {
    code: "CENTRAL_AMERICA",
    name: "América Central",
    coverageStatus: "DOCUMENTED_REFERENCE",
    classificationNote:
      "México integra este bloco exclusivamente para fins de gestão do portfólio; não é uma classificação geográfica.",
    countries: [
      country("MX", "México", 1),
      country("CR", "Costa Rica", 3),
      country("PA", "Panamá", 3),
      country("GT", "Guatemala", 3),
      country("HN", "Honduras", 3),
      country("SV", "El Salvador", 3),
      country("NI", "Nicarágua", 3),
      country("BZ", "Belize", 3),
    ],
    territories: [],
  },
  {
    code: "CARIBBEAN_ISLANDS",
    name: "Ilhas do Caribe",
    coverageStatus: "PENDING_CONFIRMATION",
    classificationNote:
      "Cuba e Haiti são citados nominalmente na documentação. Os outros países soberanos foram acrescentados como catálogo regional; presença operacional e tier dependem da decisão D-01.",
    countries: [
      country("AG", "Antígua e Barbuda", null, "REGIONAL_CATALOG"),
      country("BS", "Bahamas", null, "REGIONAL_CATALOG"),
      country("BB", "Barbados", null, "REGIONAL_CATALOG"),
      country("CU", "Cuba", 5),
      country("DM", "Dominica", null, "REGIONAL_CATALOG"),
      country("DO", "República Dominicana", null, "REGIONAL_CATALOG"),
      country("GD", "Granada", null, "REGIONAL_CATALOG"),
      country("HT", "Haiti", 5),
      country("JM", "Jamaica", null, "REGIONAL_CATALOG"),
      country("KN", "São Cristóvão e Névis", null, "REGIONAL_CATALOG"),
      country("LC", "Santa Lúcia", null, "REGIONAL_CATALOG"),
      country("VC", "São Vicente e Granadinas", null, "REGIONAL_CATALOG"),
      country("TT", "Trinidad e Tobago", null, "REGIONAL_CATALOG"),
    ],
    territories: [
      territory(
        "PR",
        "Porto Rico",
        "NON_SOVEREIGN_TERRITORY",
        { countryCode: "US", name: "Estados Unidos" },
        "Possui sistema tributário próprio e separado, com regras de coordenação e incidência também relacionadas aos Estados Unidos.",
      ),
      territory(
        "AW",
        "Aruba",
        "CONSTITUENT_COUNTRY",
        { countryCode: "NL", name: "Reino dos Países Baixos" },
        "É país constituinte autônomo dentro do Reino dos Países Baixos; legislação local e matérias do Reino devem ser avaliadas em conjunto.",
      ),
      territory(
        "CW",
        "Curaçao",
        "CONSTITUENT_COUNTRY",
        { countryCode: "NL", name: "Reino dos Países Baixos" },
        "É país constituinte autônomo dentro do Reino dos Países Baixos; legislação local e matérias do Reino devem ser avaliadas em conjunto.",
      ),
      territory(
        "KY",
        "Ilhas Cayman",
        "OVERSEAS_TERRITORY",
        { countryCode: "GB", name: "Reino Unido" },
        "É território ultramarino britânico com autoridades e legislação locais, dentro do vínculo constitucional com o Reino Unido.",
      ),
      territory(
        "GP",
        "Guadalupe",
        "OVERSEAS_REGION",
        { countryCode: "FR", name: "França" },
        "É região ultraperiférica francesa; o enquadramento deve considerar direito francês, direito da União Europeia e regras locais aplicáveis.",
      ),
      territory(
        "MQ",
        "Martinica",
        "OVERSEAS_REGION",
        { countryCode: "FR", name: "França" },
        "É região ultraperiférica francesa; o enquadramento deve considerar direito francês, direito da União Europeia e regras locais aplicáveis.",
      ),
    ],
  },
  {
    code: "SOUTH_AMERICA",
    name: "América do Sul",
    coverageStatus: "DOCUMENTED_REFERENCE",
    classificationNote:
      "Guiana, Suriname e Guiana Francesa derivam da referência agregada ‘Guianas’ e continuam sem presença operacional confirmada.",
    countries: [
      country("BR", "Brasil", 1),
      country("CO", "Colômbia", 1),
      country("AR", "Argentina", 2),
      country("CL", "Chile", 2),
      country("PE", "Peru", 2),
      country("EC", "Equador", 2),
      country("PY", "Paraguai", 2),
      country("UY", "Uruguai", 2),
      country("BO", "Bolívia", 2),
      country("GY", "Guiana", 4, "AGGREGATE_REFERENCE"),
      country("SR", "Suriname", 4, "AGGREGATE_REFERENCE"),
      country("VE", "Venezuela", 5),
    ],
    territories: [
      territory(
        "GF",
        "Guiana Francesa",
        "OVERSEAS_REGION",
        { countryCode: "FR", name: "França" },
        "É região ultraperiférica francesa na América do Sul; o enquadramento deve considerar direito francês, direito da União Europeia e regras locais aplicáveis.",
      ),
    ],
  },
];
