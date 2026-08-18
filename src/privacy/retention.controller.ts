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

@Controller("v1/system")
@UseGuards(ServiceTokenGuard)
export class RetentionController {
  constructor(private readonly privacy: PrivacyService) {}

  // Machine-to-machine: authenticated by ServiceTokenGuard (x-service-token).
  @Public()
  @Post("retention/run")
  run(
    @Query("tenantId") tenantId?: string,
    @Query("apply") apply?: string,
  ) {
    if (!tenantId) throw new BadRequestException("tenantId is required");
    return this.privacy.purgeForTenant(tenantId, apply === "true");
  }
}
