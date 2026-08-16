import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { CountryScope } from "../security/country-scope.decorator";
import { RequireRoles } from "../security/roles.decorator";
import {
  CreateEtrMeasurementDto,
  CreateOfficeScorecardDto,
  CreateTaxContingencyDto,
  CreateTaxDemandDto,
} from "./indicators.dto";
import { IndicatorsService } from "./indicators.service";

@Controller("v1/indicators")
export class IndicatorsController {
  constructor(
    private readonly indicators: IndicatorsService,
    private readonly audit: AuditService,
  ) {}

  @Get("office-scorecards")
  async listScorecards(@Req() request: Request) {
    return {
      data: await this.indicators.list("officeScorecards", request),
    };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("office-scorecards")
  async createScorecard(
    @Req() request: Request,
    @Body() body: CreateOfficeScorecardDto,
  ) {
    return this.auditCreation(
      request,
      "office-scorecard",
      await this.indicators.createScorecard(request, body),
      body.countryCode,
    );
  }

  @Get("etr-measurements")
  async listEtr(@Req() request: Request) {
    return {
      data: await this.indicators.list("etrMeasurements", request),
    };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("etr-measurements")
  async createEtr(
    @Req() request: Request,
    @Body() body: CreateEtrMeasurementDto,
  ) {
    return this.auditCreation(
      request,
      "etr-measurement",
      await this.indicators.createEtr(request, body),
      body.countryCode,
    );
  }

  @Get("demands")
  async listDemands(@Req() request: Request) {
    return {
      data: await this.indicators.list("taxDemands", request),
    };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("demands")
  async createDemand(
    @Req() request: Request,
    @Body() body: CreateTaxDemandDto,
  ) {
    return this.auditCreation(
      request,
      "tax-demand",
      await this.indicators.createDemand(request, body),
      body.countryCode,
    );
  }

  @Get("contingencies")
  async listContingencies(@Req() request: Request) {
    return {
      data: await this.indicators.list("taxContingencies", request),
    };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post("contingencies")
  async createContingency(
    @Req() request: Request,
    @Body() body: CreateTaxContingencyDto,
  ) {
    return this.auditCreation(
      request,
      "tax-contingency",
      await this.indicators.createContingency(request, body),
      body.countryCode,
    );
  }

  @Get("executive-dashboard")
  dashboard(@Req() request: Request, @Query("period") period?: string) {
    return this.indicators.dashboard(request, period);
  }

  private async auditCreation(
    request: Request,
    resourceType: string,
    record: Record<string, unknown> & { id: string },
    countryCode: string,
  ) {
    await this.audit.append(
      request,
      `${resourceType}.created`,
      resourceType,
      record.id,
      { countryCode },
    );
    return record;
  }
}
