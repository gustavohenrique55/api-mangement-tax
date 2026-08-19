import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { ProblemDetailsFilter } from "../src/platform/problem-details.filter";

describe("API Management Tax", () => {
  let app: INestApplication;
  const tenantA = {
    "x-synthetic-tenant-id": "tenant-a",
    "x-synthetic-subject": "admin-a",
    "x-synthetic-roles": "tax-admin",
  };

  beforeAll(async () => {
    process.env.AUTH_MODE = "synthetic";
    process.env.PERSISTENCE_MODE = "memory";
    process.env.COMPANY_DISPLAY_NAME = "Empresa Confidencial";
    process.env.SERVICE_TOKEN = "test-service-token";
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  it("exposes public health without identity headers", async () => {
    const response = await request(app.getHttpServer())
      .get("/v1/health")
      .expect(200);
    expect(response.body.status).toBe("ok");
    expect(response.headers["x-correlation-id"]).toBeTruthy();
  });

  it("rejects a protected endpoint without identity", async () => {
    const response = await request(app.getHttpServer())
      .get("/v1/jurisdictions")
      .expect(401);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
  });

  it("returns the anonymized documentary catalog in three management blocks", async () => {
    const response = await request(app.getHttpServer())
      .get("/v1/jurisdictions/country-groups")
      .set(tenantA)
      .expect(200);
    expect(response.body.companyDisplayName).toBe("Empresa Confidencial");
    expect(response.body.operationalPresenceConfirmed).toBe(false);
    expect(response.body.data).toHaveLength(3);
    expect(
      response.body.data.map((group: { code: string }) => group.code),
    ).toEqual(["CENTRAL_AMERICA", "CARIBBEAN_ISLANDS", "SOUTH_AMERICA"]);
    expect(response.body.data[1].coverageStatus).toBe("PENDING_CONFIRMATION");
    expect(response.body.data[1].countries).toHaveLength(13);
    expect(response.body.data[1].territories).toHaveLength(15);
    expect(
      response.body.data[1].territories.map(
        (item: { countryCode: string }) => item.countryCode,
      ),
    ).toEqual([
      "PR",
      "AW",
      "CW",
      "KY",
      "GP",
      "MQ",
      "SX",
      "BQ",
      "VG",
      "VI",
      "TC",
      "AI",
      "MS",
      "MF",
      "BL",
    ]);
    expect(response.body.data[1].territories[0]).toMatchObject({
      jurisdictionType: "NON_SOVEREIGN_TERRITORY",
      sovereignAuthority: { countryCode: "US", name: "Estados Unidos" },
      applicableLawModel: "TERRITORY_SPECIFIC_WITH_SOVEREIGN_FRAMEWORK",
      legalValidationStatus: "REQUIRED_LOCAL_COUNSEL",
    });
    expect(
      response.body.data[1].countries.map(
        (item: { countryCode: string }) => item.countryCode,
      ),
    ).toEqual([
      "AG",
      "BS",
      "BB",
      "CU",
      "DM",
      "DO",
      "GD",
      "HT",
      "JM",
      "KN",
      "LC",
      "VC",
      "TT",
    ]);
    expect(
      response.body.data.flatMap(
        (group: { countries: unknown[] }) => group.countries,
      ),
    ).toHaveLength(33);
    expect(response.body.data[2].territories).toEqual([
      expect.objectContaining({
        countryCode: "GF",
        jurisdictionType: "OVERSEAS_REGION",
        sovereignAuthority: { countryCode: "FR", name: "França" },
      }),
    ]);
  });

  it("records a territory with its sovereign authority and mandatory legal review", async () => {
    const response = await request(app.getHttpServer())
      .post("/v1/jurisdictions")
      .set({
        "x-synthetic-tenant-id": "tenant-territory",
        "x-synthetic-subject": "admin-territory",
        "x-synthetic-roles": "tax-admin",
      })
      .send({
        countryCode: "PR",
        name: "Porto Rico",
        managementBlock: "CARIBBEAN_ISLANDS",
        jurisdictionType: "NON_SOVEREIGN_TERRITORY",
        sovereignAuthorityCode: "US",
      })
      .expect(201);
    expect(response.body).toMatchObject({
      sovereignAuthorityCode: "US",
      applicableLawModel: "TERRITORY_SPECIFIC_WITH_SOVEREIGN_FRAMEWORK",
      legalValidationStatus: "REQUIRED_LOCAL_COUNSEL",
    });
  });

  it("enforces roles, tenant isolation and audit-chain integrity", async () => {
    await request(app.getHttpServer())
      .post("/v1/jurisdictions")
      .set({ ...tenantA, "x-synthetic-roles": "tax-viewer" })
      .send({
        countryCode: "BR",
        name: "Brasil",
        managementBlock: "SOUTH_AMERICA",
        jurisdictionType: "SOVEREIGN_STATE",
      })
      .expect(403);

    await request(app.getHttpServer())
      .post("/v1/jurisdictions")
      .set(tenantA)
      .send({
        countryCode: "BR",
        name: "Brasil",
        managementBlock: "SOUTH_AMERICA",
        jurisdictionType: "SOVEREIGN_STATE",
      })
      .expect(201);

    const own = await request(app.getHttpServer())
      .get("/v1/jurisdictions")
      .set(tenantA)
      .expect(200);
    expect(own.body.data).toHaveLength(1);

    const other = await request(app.getHttpServer())
      .get("/v1/jurisdictions")
      .set({
        "x-synthetic-tenant-id": "tenant-b",
        "x-synthetic-subject": "admin-b",
        "x-synthetic-roles": "tax-admin",
      })
      .expect(200);
    expect(other.body.data).toHaveLength(0);

    const audit = await request(app.getHttpServer())
      .get("/v1/audit-events")
      .set(tenantA)
      .expect(200);
    expect(audit.body.data).toHaveLength(1);
    expect(audit.body.integrityValid).toBe(true);
  });

  it("supports the eleven logistics-tax management domains", async () => {
    const headers = {
      "x-synthetic-tenant-id": "tenant-logistics",
      "x-synthetic-subject": "logistics.admin",
      "x-synthetic-roles": "tax-admin",
    };

    const reference = await request(app.getHttpServer())
      .get("/v1/reference/logistics-tax")
      .set(headers)
      .expect(200);
    expect(reference.body.operationTypes).toContain("WAREHOUSING");
    expect(reference.body.transportModes).toContain("MULTIMODAL");

    await request(app.getHttpServer())
      .post("/v1/operational-profiles")
      .set(headers)
      .send({
        countryCode: "BR",
        operationTypes: ["ROAD_TRANSPORT", "WAREHOUSING"],
        transportModes: ["ROAD", "MULTIMODAL"],
        operatingModel: "HYBRID",
        operationalPresence: "CONFIRMED",
      })
      .expect(201);

    const entity = await request(app.getHttpServer())
      .post("/v1/legal-entities")
      .set(headers)
      .send({
        countryCode: "BR",
        displayName: "Entidade Logística Sintética",
        taxIdentifierMasked: "**SYNTHETIC**",
        entityType: "CORPORATION",
        functionalCurrency: "BRL",
        status: "ACTIVE",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/v1/establishments")
      .set(headers)
      .send({
        legalEntityId: entity.body.id,
        countryCode: "BR",
        displayName: "Centro de Distribuição Sintético",
        establishmentType: "WAREHOUSE",
        city: "Cidade Sintética",
        controlModel: "LEASED",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/v1/logistics-lanes")
      .set(headers)
      .send({
        originCountryCode: "BR",
        destinationCountryCode: "MX",
        transportMode: "MULTIMODAL",
        billingEntityId: entity.body.id,
        incoterm: "DAP",
        currency: "USD",
        status: "ACTIVE",
      })
      .expect(201);

    const customsRegime = await request(app.getHttpServer())
      .post("/v1/customs-regimes")
      .set(headers)
      .send({
        countryCode: "BR",
        code: "SYNTH-DRAWBACK",
        name: "Regime sintético para demonstração",
        regimeType: "DRAWBACK",
        legalValidationStatus: "PRELIMINARY",
        sourceReference: "Fonte oficial a validar",
        legalSource: {
          jurisdictionCode: "BR",
          instrumentType: "DECREE",
          instrument: "Decreto n.º 6.759/2009",
          article: "art. 315",
          effectiveFrom: "2009-02-05",
          verificationStatus: "SOURCE_LINKED",
        },
      })
      .expect(201);
    expect(customsRegime.body.legalSourceAssessment).toMatchObject({
      status: "UNVERIFIED",
      jurisdictionAlignment: "SAME_JURISDICTION",
      concludesTreatment: false,
    });

    await request(app.getHttpServer())
      .post("/v1/tax-rules")
      .set(headers)
      .send({
        countryCode: "BR",
        taxType: "VAT_GST",
        operationType: "WAREHOUSING",
        applicabilitySummary: "Hipótese sintética sujeita à validação local.",
        legalValidationStatus: "PENDING_LOCAL_COUNSEL",
        sourceReference: "Fonte oficial a validar",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/v1/tax-documents")
      .set(headers)
      .send({
        countryCode: "BR",
        documentType: "TRANSPORT_DOCUMENT",
        externalReference: "SYNTHETIC-DOC-001",
        issueDate: "2026-08-16",
        legalEntityId: entity.body.id,
        informationClass: "INTERNAL",
      })
      .expect(201);

    const recovery = await request(app.getHttpServer())
      .post("/v1/tax-recovery-opportunities")
      .set(headers)
      .send({
        countryCode: "BR",
        legalEntityId: entity.body.id,
        creditCategory: "OPERATIONAL",
        taxType: "FREIGHT",
        taxPeriod: "2026-01",
        identifiedAmount: 1000,
        currency: "BRL",
        statutoryDeadline: "2027-12-31",
        recoveryChannel: "OFFSET",
        status: "IDENTIFIED",
        legalValidationStatus: "PRELIMINARY",
      })
      .expect(201);
    expect(recovery.body.prescriptionRisk).toBeTruthy();
    expect(recovery.body.daysUntilDeadline).toBeTypeOf("number");

    const permanentEstablishment = await request(app.getHttpServer())
      .post("/v1/permanent-establishment-assessments")
      .set(headers)
      .send({
        hostCountryCode: "MX",
        legalEntityId: entity.body.id,
        riskFactors: ["WAREHOUSE", "DEPENDENT_AGENT"],
        riskLevel: "MEDIUM",
        legalValidationStatus: "PRELIMINARY",
        preliminaryRationale:
          "Indicador sintético para revisão jurídica local.",
      })
      .expect(201);
    expect(permanentEstablishment.body).toMatchObject({
      conclusionType: "PRELIMINARY_INDICATOR_ONLY",
      requiresLocalCounsel: true,
    });

    const integration = await request(app.getHttpServer())
      .post("/v1/integration-connections")
      .set(headers)
      .send({
        systemType: "ERP",
        displayName: "ERP sintético",
        direction: "INBOUND",
        status: "PLANNED",
        secretReference: "vault://synthetic/erp",
      })
      .expect(201);
    expect(integration.body.credentialsStored).toBe(false);

    const obligation = await request(app.getHttpServer())
      .post("/v1/compliance-obligations")
      .set(headers)
      .send({
        countryCode: "BR",
        legalEntityId: entity.body.id,
        regime: "CBCR",
        filingFrequency: "ANNUAL",
        status: "IN_PREPARATION",
        dueDate: "2026-12-31",
        legalValidationStatus: "PRELIMINARY",
        sourceReference: "OCDE BEPS Ação 13",
        legalSource: {
          jurisdictionCode: "BR",
          instrumentType: "ADMINISTRATIVE_RULING",
          instrument: "Instrução Normativa RFB n.º 1.681/2016",
          effectiveFrom: "2017-01-01",
          verificationStatus: "COUNSEL_CONFIRMED",
          verifiedAt: "2026-01-15",
          verifiedBy: "Assessoria Jurídica",
        },
      })
      .expect(201);
    expect(obligation.body.daysUntilDue).toBeTypeOf("number");
    expect(obligation.body.filingRisk).toBeTruthy();
    expect(obligation.body.legalSourceAssessment).toMatchObject({
      status: "VERIFIED",
      jurisdictionAlignment: "SAME_JURISDICTION",
      concludesTreatment: false,
    });

    const audit = await request(app.getHttpServer())
      .get("/v1/audit-events")
      .set(headers)
      .expect(200);
    expect(audit.body.data).toHaveLength(11);
    expect(audit.body.integrityValid).toBe(true);
  });

  it("calculates the action-plan scorecard, ETR, SLA and risk dashboard", async () => {
    const headers = {
      "x-synthetic-tenant-id": "tenant-indicators",
      "x-synthetic-subject": "management.tax",
      "x-synthetic-roles": "tax-admin",
    };
    const scorecard = await request(app.getHttpServer())
      .post("/v1/indicators/office-scorecards")
      .set(headers)
      .send({
        officeName: "Escritório Sintético Brasil",
        countryCode: "BR",
        tier: "TIER_1",
        period: "2026-Q3",
        calibrationStatus: "BASELINE",
        closedDisputes: 10,
        favorableDisputes: 7,
        opinionsIssued: 20,
        opinionsReturnedForCorrection: 1,
        averageSimpleResponseDays: 5,
        averageComplexResponseDays: 15,
        obligationsTotal: 100,
        obligationsOnTime: 100,
        recoveredCreditsAmount: 100000,
        recoveredCreditsTarget: 100000,
        avoidedContingenciesAmount: 50000,
        avoidedContingenciesTarget: 50000,
        taxSavingsOpportunityCount: 1,
        taxSavingsAmount: 25000,
        feesPaid: 22500,
        totalValueGenerated: 150000,
        guidanceFailureAssessments: 0,
        unalertedOutOfAppetitePositions: 0,
        relevantLegalChanges: 4,
        proactivelyAlertedChanges: 4,
        repositoryCurrent: true,
      })
      .expect(201);
    expect(scorecard.body).toMatchObject({
      ide: 100,
      classification: { code: "EXCELLENT" },
      reviewCadence: "QUARTERLY",
      panelReviewAllowed: false,
    });

    const etr = await request(app.getHttpServer())
      .post("/v1/indicators/etr-measurements")
      .set(headers)
      .send({
        countryCode: "BR",
        tier: "TIER_1",
        period: "2026-Q3",
        sourceCurrency: "BRL",
        profitBeforeTax: 1000,
        currentTaxExpense: 150,
        deferredTaxExpense: 20,
        pillarTwoTopUpTax: 10,
        foreignExchangeEffect: 5,
        baselineEtrPercent: 20,
        targetEtrPercent: 17,
        optimizationImpact: -15,
      })
      .expect(201);
    expect(etr.body).toMatchObject({
      etrBeforePillarTwo: 17,
      effectiveTaxRate: 18,
      variationFromBaseline: -2,
      gapToTarget: 1,
      pillarTwoNeutralization: 1,
    });

    await request(app.getHttpServer())
      .post("/v1/indicators/demands")
      .set(headers)
      .send({
        countryCode: "BR",
        tier: "TIER_1",
        complexity: "SIMPLE",
        impact: "HIGH",
        urgency: "URGENT",
        status: "COMPLETED",
        receivedAt: "2026-08-10T08:00:00.000Z",
        completedAt: "2026-08-11T08:00:00.000Z",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          elapsedHours: 24,
          slaTargetHours: 48,
          slaStatus: "MET",
          priority: "IMMEDIATE",
        });
      });

    await request(app.getHttpServer())
      .post("/v1/indicators/contingencies")
      .set(headers)
      .send({
        countryCode: "BR",
        tier: "TIER_1",
        riskCategory: "TAX_LITIGATION",
        status: "OPEN",
        exposureAmountEur: 50000,
        openedAt: "2026-01-01",
        inheritedBeforeBaseline: false,
        outsideRiskAppetite: true,
        riskJustification: "Exceção sintética aprovada para demonstração.",
      })
      .expect(201);

    const dashboard = await request(app.getHttpServer())
      .get("/v1/indicators/executive-dashboard?period=2026-Q3")
      .set(headers)
      .expect(200);
    expect(dashboard.body).toMatchObject({
      scorecard: {
        officeCount: 1,
        averageIde: 100,
        weightedAverageIde: null,
        weightingStatus: "PENDING_CFO_MATERIALITY_PARAMETERS",
        byClassification: { EXCELLENT: 1 },
      },
      etr: {
        measurementCount: 1,
        averageEffectiveTaxRate: 18,
        consolidatedEffectiveTaxRate: 18,
      },
      financialResults: {
        recoveredCreditsAmount: 100000,
        recoveredCreditsTarget: 100000,
        avoidedContingenciesAmount: 50000,
        taxSavingsAmount: 25000,
      },
      sla: { openDemands: 0, averageResolutionHours: 24, complianceRate: 100 },
      risk: {
        openContingencies: 1,
        exposureAmountEur: 50000,
        outsideRiskAppetite: 1,
        byTier: { TIER_1: 1 },
        byCategory: { TAX_LITIGATION: 1 },
      },
    });
  });

  it("seeds the synthetic regional scenario with CFO governance and office network", async () => {
    const headers = {
      "x-synthetic-tenant-id": "tenant-regional-demo",
      "x-synthetic-subject": "regional.cfo",
      "x-synthetic-roles": "tax-admin",
    };

    const seeded = await request(app.getHttpServer())
      .post("/v1/demo/seed")
      .set(headers)
      .expect(201);
    expect(seeded.body).toMatchObject({
      seeded: true,
      summary: {
        scenario: "LATAM_CARIBBEAN_LOGISTICS_2026_Q3",
        recordsCreated: 65,
        syntheticDataOnly: true,
      },
    });
    expect(seeded.body.summary.jurisdictions).toHaveLength(8);

    const repeated = await request(app.getHttpServer())
      .post("/v1/demo/seed")
      .set(headers)
      .expect(201);
    expect(repeated.body).toMatchObject({
      seeded: false,
      reason: "ALREADY_SEEDED",
    });

    const cfo = await request(app.getHttpServer())
      .get("/v1/governance/cfo-configurations/latest")
      .set(headers)
      .expect(200);
    expect(cfo.body).toMatchObject({
      version: "DEMO-2026-Q3",
      approvalStatus: "DRAFT",
      totalCountryWeight: 100,
      calibrationRequired: true,
    });

    const network = await request(app.getHttpServer())
      .get("/v1/governance/tax-offices/summary")
      .set(headers)
      .expect(200);
    expect(network.body).toMatchObject({
      officeCount: 8,
      annualFeesEur: 380000,
      byTier: { TIER_1: 3, TIER_2: 1, TIER_3: 1, TIER_4: 2, TIER_5: 1 },
      powerOfAttorneyGaps: 1,
      privilegeProtocolPending: 1,
      coverageGaps: 0,
    });

    const dashboard = await request(app.getHttpServer())
      .get("/v1/indicators/executive-dashboard?period=2026-Q3")
      .set(headers)
      .expect(200);
    expect(dashboard.body.scorecard.officeCount).toBe(8);
    expect(dashboard.body.etr.measurementCount).toBe(8);
    expect(dashboard.body.risk.openContingencies).toBe(8);
    expect(dashboard.body.risk.outsideRiskAppetite).toBe(1);

    const profiles = await request(app.getHttpServer())
      .get("/v1/operational-profiles")
      .set(headers)
      .expect(200);
    expect(profiles.body.data).toHaveLength(8);

    const audit = await request(app.getHttpServer())
      .get("/v1/audit-events")
      .set(headers)
      .expect(200);
    expect(audit.body.data).toHaveLength(1);
    expect(audit.body.integrityValid).toBe(true);
  });

  it("enforces @RequireRoles on endpoints without an inline role check", async () => {
    const viewer = {
      "x-synthetic-tenant-id": "tenant-rbac",
      "x-synthetic-subject": "viewer-rbac",
      "x-synthetic-roles": "tax-viewer",
    };

    await request(app.getHttpServer())
      .get("/v1/audit-events")
      .set(viewer)
      .expect(403);

    await request(app.getHttpServer())
      .post("/v1/governance/tax-offices")
      .set(viewer)
      .send({
        officeCode: "SYNTH-01",
        countryCode: "BR",
        tier: "TIER_1",
        hubRole: "NONE",
        contractStatus: "ACTIVE",
      })
      .expect(403);

    await request(app.getHttpServer())
      .post("/v1/demo/seed")
      .set(viewer)
      .expect(403);
  });

  it("enforces country scope for country managers via the central guard", async () => {
    const base = {
      "x-synthetic-tenant-id": "tenant-scope",
      "x-synthetic-subject": "cm-scope",
      "x-synthetic-roles": "country-manager",
    };
    const jurisdiction = {
      countryCode: "BR",
      name: "Brasil",
      managementBlock: "SOUTH_AMERICA",
      jurisdictionType: "SOVEREIGN_STATE",
    };

    await request(app.getHttpServer())
      .post("/v1/jurisdictions")
      .set({ ...base, "x-synthetic-country-scopes": "MX" })
      .send(jurisdiction)
      .expect(403);

    await request(app.getHttpServer())
      .post("/v1/jurisdictions")
      .set({ ...base, "x-synthetic-country-scopes": "BR" })
      .send(jurisdiction)
      .expect(201);
  });

  it("supports LGPD retention policy, data export and erasure", async () => {
    const headers = {
      "x-synthetic-tenant-id": "tenant-privacy",
      "x-synthetic-subject": "operator-x",
      "x-synthetic-roles": "tax-admin",
    };
    await request(app.getHttpServer())
      .post("/v1/jurisdictions")
      .set(headers)
      .send({
        countryCode: "BR",
        name: "Brasil",
        managementBlock: "SOUTH_AMERICA",
        jurisdictionType: "SOVEREIGN_STATE",
      })
      .expect(201);

    const policy = await request(app.getHttpServer())
      .get("/v1/privacy/retention-policy")
      .set(headers)
      .expect(200);
    expect(policy.body).toMatchObject({ auditImmutable: true });
    expect(policy.body.dataRetentionDays).toBeTypeOf("number");

    const ropa = await request(app.getHttpServer())
      .get("/v1/privacy/processing-activities")
      .set(headers)
      .expect(200);
    expect(ropa.body).toMatchObject({ legalValidationStatus: "PENDING_DPO_REVIEW" });
    expect(
      ropa.body.activities.some(
        (activity: { internationalTransfer: { occurs: boolean } }) =>
          activity.internationalTransfer.occurs === true,
      ),
    ).toBe(true);

    const reviewed = await request(app.getHttpServer())
      .post("/v1/privacy/processing-activities/review")
      .set(headers)
      .send({ version: ropa.body.version, decision: "VALIDATED", notes: "Aprovado pelo DPO." })
      .expect(201);
    expect(reviewed.body).toMatchObject({
      legalValidationStatus: "VALIDATED",
      approvedBy: "operator-x",
    });

    const afterReview = await request(app.getHttpServer())
      .get("/v1/privacy/processing-activities")
      .set(headers)
      .expect(200);
    expect(afterReview.body.legalValidationStatus).toBe("VALIDATED");

    await request(app.getHttpServer())
      .post("/v1/privacy/processing-activities/review")
      .set(headers)
      .send({ version: "1999-01", decision: "VALIDATED" })
      .expect(400);

    const exported = await request(app.getHttpServer())
      .get("/v1/privacy/data-subjects/operator-x/export")
      .set(headers)
      .expect(200);
    expect(exported.body.auditTrail.length).toBeGreaterThanOrEqual(1);
    expect(
      exported.body.auditTrail.every(
        (event: { actorSubject: string }) =>
          event.actorSubject === "operator-x",
      ),
    ).toBe(true);

    const erasure = await request(app.getHttpServer())
      .post("/v1/privacy/data-subjects/operator-x/erasure")
      .set(headers)
      .expect(201);
    expect(erasure.body).toMatchObject({
      subject: "operator-x",
      status: "COMPLETED",
    });
    expect(
      erasure.body.retainedForLegalObligation.auditEvents,
    ).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .get("/v1/privacy/retention-policy")
      .set({ ...headers, "x-synthetic-roles": "tax-viewer" })
      .expect(403);
  });

  it("purges management records past retention (dry-run by default)", async () => {
    const headers = {
      "x-synthetic-tenant-id": "tenant-purge",
      "x-synthetic-subject": "purge.admin",
      "x-synthetic-roles": "tax-admin",
    };
    await request(app.getHttpServer())
      .post("/v1/demo/seed")
      .set(headers)
      .expect(201);

    const dryRun = await request(app.getHttpServer())
      .post("/v1/privacy/retention/purge")
      .set(headers)
      .expect(201);
    expect(dryRun.body).toMatchObject({ mode: "DRY_RUN", purged: 0 });
    expect(dryRun.body.eligible).toBe(0);

    process.env.DATA_RETENTION_DAYS = "0";
    try {
      const applied = await request(app.getHttpServer())
        .post("/v1/privacy/retention/purge?apply=true")
        .set(headers)
        .expect(201);
      expect(applied.body.mode).toBe("APPLIED");
      expect(applied.body.purged).toBeGreaterThanOrEqual(1);
    } finally {
      delete process.env.DATA_RETENTION_DAYS;
    }
  });

  it("guards the system retention job with a service token", async () => {
    await request(app.getHttpServer())
      .post("/v1/system/retention/run?tenantId=tenant-job")
      .expect(401);

    await request(app.getHttpServer())
      .post("/v1/system/retention/run?tenantId=tenant-job")
      .set("x-service-token", "wrong-token")
      .expect(401);

    await request(app.getHttpServer())
      .post("/v1/system/retention/run")
      .set("x-service-token", "test-service-token")
      .expect(400);

    const report = await request(app.getHttpServer())
      .post("/v1/system/retention/run?tenantId=tenant-job")
      .set("x-service-token", "test-service-token")
      .expect(201);
    expect(report.body).toMatchObject({
      mode: "DRY_RUN",
      tenantId: "tenant-job",
    });
  });

  it("provisions a tenant via the token-guarded system endpoint", async () => {
    const tenantId = "22222222-2222-2222-2222-222222222222";

    await request(app.getHttpServer())
      .post("/v1/system/tenants")
      .send({ tenantId, displayName: "Tenant Sintético" })
      .expect(401);

    const created = await request(app.getHttpServer())
      .post("/v1/system/tenants")
      .set("x-service-token", "test-service-token")
      .send({ tenantId, displayName: "Tenant Sintético" })
      .expect(201);
    expect(created.body).toMatchObject({ tenantId, status: "CREATED" });

    const again = await request(app.getHttpServer())
      .post("/v1/system/tenants")
      .set("x-service-token", "test-service-token")
      .send({ tenantId, displayName: "Tenant Sintético" })
      .expect(201);
    expect(again.body).toMatchObject({ status: "ALREADY_EXISTS" });

    await request(app.getHttpServer())
      .post("/v1/system/tenants")
      .set("x-service-token", "test-service-token")
      .send({ displayName: "sem tenantId" })
      .expect(400);
  });

  it("guards user provisioning and reports when the IdP is not configured", async () => {
    const body = {
      username: "novo.operador",
      email: "novo.operador@example.local",
      tenantId: "22222222-2222-2222-2222-222222222222",
      roles: ["tax-viewer"],
      countryScopes: ["BR"],
    };

    await request(app.getHttpServer())
      .post("/v1/system/users")
      .send(body)
      .expect(401);

    // Keycloak admin is not configured in this suite -> graceful 503.
    await request(app.getHttpServer())
      .post("/v1/system/users")
      .set("x-service-token", "test-service-token")
      .send(body)
      .expect(503);
  });
});
