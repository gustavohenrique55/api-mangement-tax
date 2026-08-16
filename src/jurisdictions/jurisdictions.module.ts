import { Module } from "@nestjs/common";
import { JurisdictionsController } from "./jurisdictions.controller";
import { JurisdictionsService } from "./jurisdictions.service";

@Module({
  controllers: [JurisdictionsController],
  providers: [JurisdictionsService],
})
export class JurisdictionsModule {}
