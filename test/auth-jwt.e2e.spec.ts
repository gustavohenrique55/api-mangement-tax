import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { ProblemDetailsFilter } from "../src/platform/problem-details.filter";

describe("JWT authentication", () => {
  let app: INestApplication;
  let jwksServer: Server;
  let privateKey: CryptoKey;
  const issuer = "https://test-idp.local/";
  const audience = "api-management-tax";

  beforeAll(async () => {
    const { publicKey, privateKey: signingKey } = await generateKeyPair(
      "RS256",
      { extractable: true },
    );
    privateKey = signingKey;
    const jwk = {
      ...(await exportJWK(publicKey)),
      kid: "test-key",
      alg: "RS256",
      use: "sig",
    };
    jwksServer = createServer((_req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ keys: [jwk] }));
    });
    await new Promise<void>((resolve) =>
      jwksServer.listen(0, "127.0.0.1", resolve),
    );
    const port = (jwksServer.address() as AddressInfo).port;

    process.env.AUTH_MODE = "jwt";
    process.env.PERSISTENCE_MODE = "memory";
    process.env.OIDC_JWKS_URI = `http://127.0.0.1:${port}/jwks.json`;
    process.env.OIDC_ISSUER = issuer;
    process.env.OIDC_AUDIENCE = audience;

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
    await new Promise<void>((resolve) => jwksServer.close(() => resolve()));
    delete process.env.AUTH_MODE;
    delete process.env.OIDC_JWKS_URI;
    delete process.env.OIDC_ISSUER;
    delete process.env.OIDC_AUDIENCE;
  });

  const sign = (claims: Record<string, unknown>, key = privateKey) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(String(claims.sub ?? "user"))
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);

  it("rejects a protected endpoint without a bearer token", async () => {
    await request(app.getHttpServer()).get("/v1/jurisdictions").expect(401);
  });

  it("accepts a valid token and maps claims to the actor", async () => {
    const token = await sign({
      sub: "admin-jwt",
      tenant_id: "tenant-jwt",
      roles: ["tax-admin"],
      country_scopes: ["BR"],
    });
    const response = await request(app.getHttpServer())
      .get("/v1/identity-context")
      .set("authorization", `Bearer ${token}`)
      .expect(200);
    expect(response.body).toMatchObject({
      tenantId: "tenant-jwt",
      subject: "admin-jwt",
      roles: ["tax-admin"],
      countryScopes: ["BR"],
    });
  });

  it("rejects a token signed by an untrusted key", async () => {
    const { privateKey: rogueKey } = await generateKeyPair("RS256", {
      extractable: true,
    });
    const token = await sign({ sub: "x", tenant_id: "t" }, rogueKey);
    await request(app.getHttpServer())
      .get("/v1/jurisdictions")
      .set("authorization", `Bearer ${token}`)
      .expect(401);
  });
});
