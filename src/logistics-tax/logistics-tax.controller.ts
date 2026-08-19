import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { CountryScope } from "../security/country-scope.decorator";
import { RequireRoles } from "../security/roles.decorator";
import {
  CreateCustomsRegimeDto,
  CreateComplianceObligationDto,
  CreateEstablishmentDto,
  CreateIntegrationConnectionDto,
  CreateLegalEntityDto,
  CreateLogisticsLaneDto,
  CreateOperationalProfileDto,
  CreatePermanentEstablishmentAssessmentDto,
  CreateTaxDocumentDto,
  CreateTaxRecoveryOpportunityDto,
  CreateTaxRuleDto,
} from "./logistics-tax.dto";
import {
  LogisticsTaxService,
  type LogisticsResource,
} from "./logistics-tax.service";
import { OPERATION_TYPES, TRANSPORT_MODES } from "./logistics-tax.types";

@Controller("v1")
export class LogisticsTaxController {
  constructor(
    private readonly domain: LogisticsTaxService,
    private readonly audit: AuditService,
  ) {}

  @Get("reference/logistics-tax")
  referenceData() {
    return { transportModes: TRANSPORT_MODES, operationTypes: OPERATION_TYPES };
  }

  @Get("operational-profiles")
  async listOperationalProfiles(@Req() request: Request) {
    return { data: await this.domain.list("operationalProfiles", request) };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("operational-profiles")
  createOperationalProfile(
    @Req() request: Request,
    @Body() body: CreateOperationalProfileDto,
  ) {
    return this.create(
      "operationalProfiles",
      "operational-profile",
      request,
      { ...body },
      [body.countryCode],
    );
  }

  @Get("legal-entities")
  async listLegalEntities(@Req() request: Request) {
    return { data: await this.domain.list("legalEntities", request) };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("legal-entities")
  createLegalEntity(
    @Req() request: Request,
    @Body() body: CreateLegalEntityDto,
  ) {
    return this.create("legalEntities", "legal-entity", request, { ...body }, [
      body.countryCode,
    ]);
  }

  @Get("establishments")
  async listEstablishments(@Req() request: Request) {
    return { data: await this.domain.list("establishments", request) };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("establishments")
  createEstablishment(
    @Req() request: Request,
    @Body() body: CreateEstablishmentDto,
  ) {
    return this.create(
      "establishments",
      "establishment",
      request,
      { ...body },
      [body.countryCode],
    );
  }

  @Get("logistics-lanes")
  async listLogisticsLanes(@Req() request: Request) {
    return { data: await this.domain.list("logisticsLanes", request) };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("originCountryCode", "destinationCountryCode")
  @Post("logistics-lanes")
  createLogisticsLane(
    @Req() request: Request,
    @Body() body: CreateLogisticsLaneDto,
  ) {
    return this.create(
      "logisticsLanes",
      "logistics-lane",
      request,
      { ...body },
      [body.originCountryCode, body.destinationCountryCode],
    );
  }

  @Get("customs-regimes")
  async listCustomsRegimes(@Req() request: Request) {
    return { data: await this.domain.list("customsRegimes", request) };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("customs-regimes")
  createCustomsRegime(
    @Req() request: Request,
    @Body() body: CreateCustomsRegimeDto,
  ) {
    return this.create(
      "customsRegimes",
      "customs-regime",
      request,
      { ...body },
      [body.countryCode],
    );
  }

  @Get("tax-rules")
  async listTaxRules(@Req() request: Request) {
    return { data: await this.domain.list("taxRules", request) };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("tax-rules")
  createTaxRule(@Req() request: Request, @Body() body: CreateTaxRuleDto) {
    return this.create("taxRules", "tax-rule", request, { ...body }, [
      body.countryCode,
    ]);
  }

  @Get("tax-documents")
  async listTaxDocuments(@Req() request: Request) {
    return { data: await this.domain.list("taxDocuments", request) };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("tax-documents")
  createTaxDocument(
    @Req() request: Request,
    @Body() body: CreateTaxDocumentDto,
  ) {
    return this.create("taxDocuments", "tax-document", request, { ...body }, [
      body.countryCode,
    ]);
  }

  @Get("tax-recovery-opportunities")
  async listTaxRecoveryOpportunities(@Req() request: Request) {
    return {
      data: await this.domain.list("taxRecoveryOpportunities", request),
    };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("tax-recovery-opportunities")
  createTaxRecoveryOpportunity(
    @Req() request: Request,
    @Body() body: CreateTaxRecoveryOpportunityDto,
  ) {
    return this.create(
      "taxRecoveryOpportunities",
      "tax-recovery-opportunity",
      request,
      { ...body },
      [body.countryCode],
    );
  }

  @Get("permanent-establishment-assessments")
  async listPermanentEstablishmentAssessments(@Req() request: Request) {
    return {
      data: await this.domain.list(
        "permanentEstablishmentAssessments",
        request,
      ),
    };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("hostCountryCode")
  @Post("permanent-establishment-assessments")
  createPermanentEstablishmentAssessment(
    @Req() request: Request,
    @Body() body: CreatePermanentEstablishmentAssessmentDto,
  ) {
    return this.create(
      "permanentEstablishmentAssessments",
      "permanent-establishment-assessment",
      request,
      { ...body },
      [body.hostCountryCode],
    );
  }

  @Get("integration-connections")
  async listIntegrationConnections(@Req() request: Request) {
    return {
      data: await this.domain.list("integrationConnections", request),
    };
  }

  @RequireRoles("tax-admin")
  @Post("integration-connections")
  createIntegrationConnection(
    @Req() request: Request,
    @Body() body: CreateIntegrationConnectionDto,
  ) {
    return this.create(
      "integrationConnections",
      "integration-connection",
      request,
      { ...body },
    );
  }

  @Get("compliance-obligations")
  async listComplianceObligations(@Req() request: Request) {
    return { data: await this.domain.list("complianceObligations", request) };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("compliance-obligations")
  createComplianceObligation(
    @Req() request: Request,
    @Body() body: CreateComplianceObligationDto,
  ) {
    return this.create(
      "complianceObligations",
      "compliance-obligation",
      request,
      { ...body },
      [body.countryCode],
    );
  }

  private async create(
    resource: LogisticsResource,
    auditResource: string,
    request: Request,
    input: Record<string, unknown>,
    countryCodes: string[] = [],
  ) {
    const record = await this.domain.create(
      resource,
      request,
      input,
      countryCodes,
    );
    await this.audit.append(
      request,
      `${auditResource}.created`,
      auditResource,
      record.id,
      {
        countryCodes,
        legalValidationStatus: record.legalValidationStatus,
      },
    );
    return record;
  }
}
