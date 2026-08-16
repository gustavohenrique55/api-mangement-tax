import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class SyntheticAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    if ((process.env.AUTH_MODE ?? "synthetic") !== "synthetic") {
      throw new UnauthorizedException(
        "No production identity provider is configured",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = request.header("x-synthetic-tenant-id");
    const subject = request.header("x-synthetic-subject");
    if (!tenantId || !subject) {
      throw new UnauthorizedException(
        "Synthetic identity headers are required in local development",
      );
    }
    request.actor = {
      tenantId,
      subject,
      roles: splitHeader(request.header("x-synthetic-roles") ?? "tax-viewer"),
      countryScopes: splitHeader(
        request.header("x-synthetic-country-scopes") ?? "",
      ),
    };
    return true;
  }
}

function splitHeader(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
