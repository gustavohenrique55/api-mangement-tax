import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { RequireRoles } from "../security/roles.decorator";
import { ApproveRopaDto } from "./privacy.dto";
import { PrivacyService } from "./privacy.service";

@RequireRoles("tax-admin")
@Controller("v1/privacy")
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get("retention-policy")
  retentionPolicy() {
    return this.privacy.retentionPolicy();
  }

  @Get("processing-activities")
  processingActivities(@Req() request: Request) {
    return this.privacy.processingActivities(request);
  }

  @RequireRoles("privacy-officer")
  @Post("processing-activities/review")
  reviewProcessingActivities(
    @Req() request: Request,
    @Body() body: ApproveRopaDto,
  ) {
    return this.privacy.reviewProcessingActivities(
      request,
      body.version,
      body.decision,
      body.notes,
    );
  }

  @Get("data-subjects/:subject/export")
  exportSubject(@Req() request: Request, @Param("subject") subject: string) {
    return this.privacy.exportSubject(request, subject);
  }

  @Post("data-subjects/:subject/erasure")
  eraseSubject(@Req() request: Request, @Param("subject") subject: string) {
    return this.privacy.eraseSubject(request, subject);
  }

  @RequireRoles("privacy-officer")
  @Post("retention/purge")
  purgeByRetention(
    @Req() request: Request,
    @Query("apply") apply?: string,
  ) {
    return this.privacy.purgeByRetention(request, apply === "true");
  }
}
