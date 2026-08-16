import { Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { RequireRoles } from "../security/roles.decorator";
import { PrivacyService } from "./privacy.service";

@RequireRoles("tax-admin")
@Controller("v1/privacy")
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get("retention-policy")
  retentionPolicy() {
    return this.privacy.retentionPolicy();
  }

  @Get("data-subjects/:subject/export")
  exportSubject(@Req() request: Request, @Param("subject") subject: string) {
    return this.privacy.exportSubject(request, subject);
  }

  @Post("data-subjects/:subject/erasure")
  eraseSubject(@Req() request: Request, @Param("subject") subject: string) {
    return this.privacy.eraseSubject(request, subject);
  }
}
