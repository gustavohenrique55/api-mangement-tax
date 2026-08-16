import { Module } from "@nestjs/common";
import { PrivacyController } from "./privacy.controller";
import { PrivacyService } from "./privacy.service";
import { RetentionController } from "./retention.controller";

@Module({
  controllers: [PrivacyController, RetentionController],
  providers: [PrivacyService],
})
export class PrivacyModule {}
