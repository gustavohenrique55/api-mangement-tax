import { Module } from "@nestjs/common";
import { KeycloakAdminService } from "./keycloak-admin.service";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService, KeycloakAdminService],
})
export class OnboardingModule {}
