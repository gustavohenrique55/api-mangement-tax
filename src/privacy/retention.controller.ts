import {
  BadRequestException,
  Controller,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { Public } from "../security/public.decorator";
import { PrivacyService } from "./privacy.service";

@Controller("v1/system")
export class RetentionController {
  constructor(private readonly privacy: PrivacyService) {}

  // Machine-to-machine: authenticated by a shared service token, not a user identity.
  @Public()
  @Post("retention/run")
  run(
    @Req() request: Request,
    @Query("tenantId") tenantId?: string,
    @Query("apply") apply?: string,
  ) {
    const expected = process.env.RETENTION_JOB_TOKEN;
    if (!expected) {
      throw new ServiceUnavailableException(
        "Retention job token is not configured",
      );
    }
    if (!tokenMatches(request.header("x-service-token"), expected)) {
      throw new UnauthorizedException("Invalid service token");
    }
    if (!tenantId) throw new BadRequestException("tenantId is required");
    return this.privacy.purgeForTenant(tenantId, apply === "true");
  }
}

function tokenMatches(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
