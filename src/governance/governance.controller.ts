import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { RequireRoles } from "../security/roles.decorator";
import {
  CreateCfoConfigurationDto,
  CreateTaxOfficeDto,
} from "./governance.dto";
import { GovernanceService } from "./governance.service";

@Controller("v1/governance")
export class GovernanceController {
  constructor(
    private readonly governance: GovernanceService,
    private readonly audit: AuditService,
  ) {}

  @Get("cfo-configurations")
  async listConfigurations(@Req() request: Request) {
    return { data: await this.governance.list("cfoConfigurations", request) };
  }

  @Get("cfo-configurations/latest")
  latestConfiguration(@Req() request: Request) {
    return this.governance.latestCfoConfiguration(request);
  }

  @RequireRoles("tax-admin")
  @Post("cfo-configurations")
  async createConfiguration(
    @Req() request: Request,
    @Body() body: CreateCfoConfigurationDto,
  ) {
    const record = await this.governance.createCfoConfiguration(request, body);
    return this.auditRecord(request, "cfo-configuration", record);
  }

  @Get("tax-offices")
  async listOffices(@Req() request: Request) {
    return { data: await this.governance.list("taxOffices", request) };
  }

  @Get("tax-offices/summary")
  networkSummary(@Req() request: Request) {
    return this.governance.networkSummary(request);
  }

  @RequireRoles("tax-admin")
  @Post("tax-offices")
  async createOffice(
    @Req() request: Request,
    @Body() body: CreateTaxOfficeDto,
  ) {
    const record = await this.governance.createTaxOffice(request, body);
    return this.auditRecord(request, "tax-office", record);
  }

  private async auditRecord(
    request: Request,
    resourceType: string,
    record: Record<string, unknown> & { id: string },
  ) {
    await this.audit.append(
      request,
      `${resourceType}.created`,
      resourceType,
      record.id,
      {},
    );
    return record;
  }
}
