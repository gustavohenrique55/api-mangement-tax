import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { COUNTRY_SCOPE_FIELDS_KEY } from "./country-scope.decorator";

@Injectable()
export class CountryScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const fields = this.reflector.getAllAndOverride<string[]>(
      COUNTRY_SCOPE_FIELDS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!fields || fields.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const actor = request.actor;
    if (!actor) throw new ForbiddenException("Missing identity context");
    if (actor.roles.includes("tax-admin")) return true;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const codes = fields
      .map((field) => body[field])
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toUpperCase());

    if (
      codes.length === 0 ||
      codes.some((code) => !actor.countryScopes.includes(code))
    ) {
      throw new ForbiddenException(
        "The identity is outside one or more requested country scopes",
      );
    }
    return true;
  }
}
