import { Module } from "@nestjs/common";
import { GovernanceModule } from "../governance/governance.module";
import { IndicatorsModule } from "../indicators/indicators.module";
import { LogisticsTaxModule } from "../logistics-tax/logistics-tax.module";
import { DemoController } from "./demo.controller";
import { DemoService } from "./demo.service";

@Module({
  imports: [GovernanceModule, IndicatorsModule, LogisticsTaxModule],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
