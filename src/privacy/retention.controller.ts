import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Public } from "../security/public.decorator";
import { ServiceTokenGuard } from "../security/service-token.guard";
import { PrivacyService } from "./privacy.service";

// Rejects unrecognised values instead of silently defaulting to dry-run.
function parseApply(value?: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  throw new BadRequestException(
    `apply must be 'true' or 'false' (case-insensitive); received: '${value}'`,
  );
}

@Controller("v1/system")
@UseGuards(ServiceTokenGuard)
export class RetentionController {
  constructor(private readonly privacy: PrivacyService) {}

  // Machine-to-machine retention purge — authenticated by service token (x-service-token),
  // not by user RBAC. Scheduled jobs run without a human JWT context, so the privacy-officer
  // role gate on POST /v1/privacy/retention/purge does not apply here.
  //
  // Traceability: purgeForTenant writes a "privacy.retention-purge" audit event attributed to
  // actorSubject="system:retention-job" for every apply=true call (even when purged=0), so the
  // full operation history is auditable without a human actor. This is the authorised bypass.
  @Public()
  @Post("retention/run")
  run(
    @Query("tenantId") tenantId?: string,
    @Query("apply") apply?: string,
  ) {
    const tid = tenantId?.trim();
    if (!tid) throw new BadRequestException("tenantId is required");
    return this.privacy.purgeForTenant(tid, parseApply(apply));
  }
}
