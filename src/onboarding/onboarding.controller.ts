import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Public } from "../security/public.decorator";
import { ServiceTokenGuard } from "../security/service-token.guard";
import { CreateTenantDto, CreateUserDto } from "./onboarding.dto";
import { OnboardingService } from "./onboarding.service";

@Controller("v1/system")
@UseGuards(ServiceTokenGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Public()
  @Post("tenants")
  createTenant(@Body() body: CreateTenantDto) {
    return this.onboarding.createTenant(body.tenantId, body.displayName);
  }

  @Public()
  @Post("users")
  createUser(@Body() body: CreateUserDto) {
    return this.onboarding.provisionUser({
      username: body.username,
      email: body.email,
      tenantId: body.tenantId,
      roles: body.roles,
      countryScopes: body.countryScopes,
      temporaryPassword: body.temporaryPassword,
    });
  }
}
