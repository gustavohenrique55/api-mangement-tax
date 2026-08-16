import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyOptions,
} from "jose";
import { IS_PUBLIC_KEY } from "./public.decorator";

type Actor = NonNullable<Request["actor"]>;
type RemoteJWKSet = ReturnType<typeof createRemoteJWKSet>;

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks?: RemoteJWKSet;

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const mode = process.env.AUTH_MODE ?? "synthetic";
    if (mode === "synthetic") {
      request.actor = this.resolveSyntheticActor(request);
      return true;
    }
    if (mode === "jwt" || mode === "oidc") {
      request.actor = await this.resolveJwtActor(request);
      return true;
    }
    throw new UnauthorizedException("No identity provider is configured");
  }

  private resolveSyntheticActor(request: Request): Actor {
    const tenantId = request.header("x-synthetic-tenant-id");
    const subject = request.header("x-synthetic-subject");
    if (!tenantId || !subject) {
      throw new UnauthorizedException(
        "Synthetic identity headers are required in local development",
      );
    }
    return {
      tenantId,
      subject,
      roles: splitList(request.header("x-synthetic-roles") ?? "tax-viewer"),
      countryScopes: splitList(
        request.header("x-synthetic-country-scopes") ?? "",
      ),
    };
  }

  private async resolveJwtActor(request: Request): Promise<Actor> {
    const header = request.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("A bearer token is required");
    }
    const jwksUri = process.env.OIDC_JWKS_URI;
    if (!jwksUri) {
      throw new UnauthorizedException("OIDC_JWKS_URI is not configured");
    }
    this.jwks ??= createRemoteJWKSet(new URL(jwksUri));

    const options: JWTVerifyOptions = {};
    if (process.env.OIDC_ISSUER) options.issuer = process.env.OIDC_ISSUER;
    if (process.env.OIDC_AUDIENCE) options.audience = process.env.OIDC_AUDIENCE;

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(header.slice(7), this.jwks, options));
    } catch {
      throw new UnauthorizedException("The bearer token is invalid");
    }
    return this.mapClaims(payload);
  }

  private mapClaims(payload: JWTPayload): Actor {
    const tenantId = String(
      payload[process.env.JWT_TENANT_CLAIM ?? "tenant_id"] ?? "",
    );
    const subject = payload.sub ?? "";
    if (!tenantId || !subject) {
      throw new UnauthorizedException(
        "The token is missing the tenant or subject claim",
      );
    }
    return {
      tenantId,
      subject,
      roles: toStringList(payload[process.env.JWT_ROLES_CLAIM ?? "roles"]),
      countryScopes: toStringList(
        payload[process.env.JWT_COUNTRY_SCOPES_CLAIM ?? "country_scopes"],
      ),
    };
  }
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return splitList(value);
  return [];
}
