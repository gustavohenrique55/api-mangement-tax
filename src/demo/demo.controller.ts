import { Controller, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { RequireRoles } from "../security/roles.decorator";
import { DemoService } from "./demo.service";

@Controller("v1/demo")
export class DemoController {
  constructor(
    private readonly demo: DemoService,
    private readonly audit: AuditService,
  ) {}

  @RequireRoles("tax-admin")
  @Post("seed")
  async seed(@Req() request: Request) {
    const result = await this.demo.seed(request);
    if (result.seeded) {
      await this.audit.append(
        request,
        "demo.seeded",
        "demo-scenario",
        result.summary?.id ?? "unknown",
        { syntheticDataOnly: true },
      );
    }
    return result;
  }
}
