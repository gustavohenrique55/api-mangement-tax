import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { ProblemDetailsFilter } from "../src/platform/problem-details.filter";

// Runs only when a Keycloak dev instance is available:
//   docker compose --profile idp up -d keycloak
//   KEYCLOAK_URL=http://localhost:8080 pnpm test:oidc
// CI runs this in the dedicated `oidc-integration` job.
const keycloakUrl = process.env.KEYCLOAK_URL;
const realm = `${keycloakUrl}/realms/management-tax`;

describe.skipIf(!keycloakUrl)("Keycloak OIDC integration", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.AUTH_MODE = "jwt";
    process.env.PERSISTENCE_MODE = "memory";
    process.env.OIDC_JWKS_URI = `${realm}/protocol/openid-connect/certs`;
    process.env.OIDC_ISSUER = realm;
    process.env.OIDC_AUDIENCE = "api-management-tax";

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function passwordGrantToken(): Promise<string> {
    const response = await fetch(
      `${realm}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "password",
          client_id: "api-management-tax",
          username: "demo",
          password: "demo",
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }
    const payload = (await response.json()) as { access_token: string };
    return payload.access_token;
  }

  it("authenticates a Keycloak token and maps claims to the actor", async () => {
    const token = await passwordGrantToken();
    const response = await request(app.getHttpServer())
      .get("/v1/identity-context")
      .set("authorization", `Bearer ${token}`)
      .expect(200);
    expect(response.body).toMatchObject({
      tenantId: "11111111-1111-1111-1111-111111111111",
      subject: expect.any(String),
    });
    expect(response.body.roles).toContain("tax-admin");
    expect(response.body.countryScopes).toEqual(
      expect.arrayContaining(["BR", "MX"]),
    );
  });
});
