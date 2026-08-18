import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class OnboardingService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async createTenant(tenantId: string, displayName: string) {
    const { created } = await this.database.provisionTenant(
      tenantId,
      displayName,
    );
    if (created) {
      await this.audit.appendSystem(
        tenantId,
        "tenant.provisioned",
        "tenant",
        tenantId,
        { displayName },
      );
    }
    return {
      tenantId,
      displayName,
      status: created ? "CREATED" : "ALREADY_EXISTS",
    };
  }
}
