import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Public } from "../security/public.decorator";
import { ServiceTokenGuard } from "../security/service-token.guard";
import { CreateTenantDto } from "./onboarding.dto";
import { OnboardingService } from "./onboarding.service";

@Controller("v1/system/tenants")
@UseGuards(ServiceTokenGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Public()
  @Post()
  create(@Body() body: CreateTenantDto) {
    return this.onboarding.createTenant(body.tenantId, body.displayName);
  }
}
