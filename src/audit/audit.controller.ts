import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { RequireRoles } from "../security/roles.decorator";
import { AuditService } from "./audit.service";

@RequireRoles("tax-admin", "auditor")
@Controller("v1/audit-events")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(@Req() request: Request) {
    const tenantId = request.actor!.tenantId;
    return {
      data: await this.audit.list(tenantId),
      integrityValid: await this.audit.verify(tenantId),
    };
  }
}
