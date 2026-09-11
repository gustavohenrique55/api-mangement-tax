import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../database/database.service";
import {
  KeycloakAdminService,
  type ProvisionUserInput,
} from "./keycloak-admin.service";

@Injectable()
export class OnboardingService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly keycloak: KeycloakAdminService,
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

  async provisionUser(input: ProvisionUserInput) {
    if (!this.keycloak.isConfigured()) {
      throw new ServiceUnavailableException(
        "Keycloak admin integration is not configured",
      );
    }
    const { userId } = await this.keycloak.createUser(input);
    await this.audit.appendSystem(
      input.tenantId,
      "user.provisioned",
      "user",
      userId,
      { username: input.username, roles: input.roles },
    );
    return { userId, username: input.username, status: "CREATED" };
  }
}
