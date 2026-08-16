import { Global, Module } from "@nestjs/common";
import { DatabaseService } from "./database.service";
import { ManagementRecordRepository } from "./management-record.repository";

@Global()
@Module({
  providers: [DatabaseService, ManagementRecordRepository],
  exports: [DatabaseService, ManagementRecordRepository],
})
export class DatabaseModule {}
