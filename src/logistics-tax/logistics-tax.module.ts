import { Module } from "@nestjs/common";
import { LogisticsTaxController } from "./logistics-tax.controller";
import { LogisticsTaxService } from "./logistics-tax.service";

@Module({
  controllers: [LogisticsTaxController],
  providers: [LogisticsTaxService],
  exports: [LogisticsTaxService],
})
export class LogisticsTaxModule {}
