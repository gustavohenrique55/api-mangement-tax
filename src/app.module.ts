import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuditModule } from "./audit/audit.module";
import { DatabaseModule } from "./database/database.module";
import { DemoModule } from "./demo/demo.module";
import { HealthController } from "./health/health.controller";
import { GovernanceModule } from "./governance/governance.module";
import { IdentityController } from "./identity/identity.controller";
import { IndicatorsModule } from "./indicators/indicators.module";
import { JurisdictionsModule } from "./jurisdictions/jurisdictions.module";
import { LogisticsTaxModule } from "./logistics-tax/logistics-tax.module";
import { CorrelationMiddleware } from "./platform/correlation.middleware";
import { RolesGuard } from "./security/roles.guard";
import { SyntheticAuthGuard } from "./security/synthetic-auth.guard";

@Module({
  imports: [
    AuditModule,
    DatabaseModule,
    DemoModule,
    GovernanceModule,
    JurisdictionsModule,
    LogisticsTaxModule,
    IndicatorsModule,
  ],
  controllers: [HealthController, IdentityController],
  providers: [
    { provide: APP_GUARD, useClass: SyntheticAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes("*");
  }
}
