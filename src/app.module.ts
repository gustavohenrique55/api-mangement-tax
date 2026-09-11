import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuditModule } from "./audit/audit.module";
import { DatabaseModule } from "./database/database.module";
import { DemoModule } from "./demo/demo.module";
import { HealthController } from "./health/health.controller";
import { GovernanceModule } from "./governance/governance.module";
import { IdentityController } from "./identity/identity.controller";
import { IndicatorsModule } from "./indicators/indicators.module";
import { JurisdictionsModule } from "./jurisdictions/jurisdictions.module";
import { LogisticsTaxModule } from "./logistics-tax/logistics-tax.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { PrivacyModule } from "./privacy/privacy.module";
import { CorrelationMiddleware } from "./platform/correlation.middleware";
import { AuthGuard } from "./security/auth.guard";
import { CountryScopeGuard } from "./security/country-scope.guard";
import { RolesGuard } from "./security/roles.guard";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
    ]),
    AuditModule,
    DatabaseModule,
    DemoModule,
    GovernanceModule,
    JurisdictionsModule,
    LogisticsTaxModule,
    IndicatorsModule,
    PrivacyModule,
    OnboardingModule,
  ],
  controllers: [HealthController, IdentityController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CountryScopeGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes("*");
  }
}
