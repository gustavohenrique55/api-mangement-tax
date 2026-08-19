import { Injectable } from "@nestjs/common";

export interface ProvisionUserInput {
  username: string;
  email: string;
  tenantId: string;
  roles: string[];
  countryScopes: string[];
  temporaryPassword?: string | undefined;
}

interface RoleRepresentation {
  id: string;
  name: string;
}

@Injectable()
export class KeycloakAdminService {
  private get baseUrl(): string | undefined {
    return process.env.KEYCLOAK_BASE_URL;
  }
  private get realm(): string {
    return process.env.KEYCLOAK_REALM ?? "management-tax";
  }

  isConfigured(): boolean {
    return Boolean(
      this.baseUrl &&
        process.env.KEYCLOAK_ADMIN_CLIENT_ID &&
        process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
    );
  }

  async createUser(input: ProvisionUserInput): Promise<{ userId: string }> {
    const token = await this.adminToken();
    const created = await fetch(
      `${this.baseUrl}/admin/realms/${this.realm}/users`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: input.username,
          email: input.email,
          enabled: true,
          emailVerified: true,
          firstName: input.username,
          lastName: "-",
          attributes: {
            tenant_id: [input.tenantId],
            country_scopes: input.countryScopes,
          },
          credentials: input.temporaryPassword
            ? [
                {
                  type: "password",
                  value: input.temporaryPassword,
                  temporary: true,
                },
              ]
            : undefined,
        }),
      },
    );
    if (created.status !== 201) {
      throw new Error(`Keycloak user creation failed: ${created.status}`);
    }
    const userId = created.headers.get("location")?.split("/").pop() ?? "";

    if (input.roles.length > 0) {
      const roles = await Promise.all(
        input.roles.map((name) => this.realmRole(token, name)),
      );
      const response = await fetch(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(roles),
        },
      );
      if (!response.ok) {
        throw new Error(`Keycloak role assignment failed: ${response.status}`);
      }
    }
    return { userId };
  }

  private async adminToken(): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID ?? "",
          client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET ?? "",
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Keycloak admin token failed: ${response.status}`);
    }
    const payload = (await response.json()) as { access_token: string };
    return payload.access_token;
  }

  private async realmRole(
    token: string,
    name: string,
  ): Promise<RoleRepresentation> {
    const response = await fetch(
      `${this.baseUrl}/admin/realms/${this.realm}/roles/${encodeURIComponent(name)}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      throw new Error(`Keycloak role lookup failed for ${name}`);
    }
    return (await response.json()) as RoleRepresentation;
  }
}
