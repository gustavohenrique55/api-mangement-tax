import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { CountryScope } from "../security/country-scope.decorator";
import { RequireRoles } from "../security/roles.decorator";
import {
  CreateJurisdictionDto,
  UpdateJurisdictionDto,
} from "./jurisdiction.dto";
import { JurisdictionsService } from "./jurisdictions.service";

@Controller("v1/jurisdictions")
export class JurisdictionsController {
  constructor(
    private readonly jurisdictions: JurisdictionsService,
    private readonly audit: AuditService,
  ) {}

  @Get("country-groups")
  countryGroups() {
    return {
      companyDisplayName:
        process.env.COMPANY_DISPLAY_NAME ?? "Empresa Confidencial",
      operationalPresenceConfirmed: false,
      data: this.jurisdictions.countryGroups(),
    };
  }

  @Get()
  async list(@Req() request: Request) {
    return {
      data: await this.jurisdictions.list(
        request.actor!.tenantId,
        request.actor!.countryScopes,
      ),
    };
  }

  @RequireRoles("tax-admin", "country-manager")
  @CountryScope("countryCode")
  @Post()
  async create(@Req() request: Request, @Body() body: CreateJurisdictionDto) {
    const actor = request.actor!;
    const record = await this.jurisdictions.create(actor.tenantId, body);
    await this.audit.append(
      request,
      "jurisdiction.created",
      "jurisdiction",
      record.id,
      {
        countryCode: record.countryCode,
        jurisdictionType: record.jurisdictionType,
        sovereignAuthorityCode: record.sovereignAuthorityCode,
        legalValidationStatus: record.legalValidationStatus,
      },
    );
    return record;
  }

  @RequireRoles("tax-admin", "country-manager")
  @Patch(":id")
  async update(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() body: UpdateJurisdictionDto,
  ) {
    const actor = request.actor!;
    const record = await this.jurisdictions.update(
      actor.tenantId,
      id,
      body,
      actor.roles.includes("tax-admin") ? [] : actor.countryScopes,
    );
    await this.audit.append(
      request,
      "jurisdiction.updated",
      "jurisdiction",
      record.id,
      { ...body },
    );
    return record;
  }
}
