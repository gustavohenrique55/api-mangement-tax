import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

// Machine-to-machine auth for /v1/system/* endpoints via a shared service token.
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.SERVICE_TOKEN;
    if (!expected) {
      throw new ServiceUnavailableException(
        "Service token is not configured",
      );
    }
    const request = context.switchToHttp().getRequest<Request>();
    if (!tokenMatches(request.header("x-service-token"), expected)) {
      throw new UnauthorizedException("Invalid service token");
    }
    return true;
  }
}

function tokenMatches(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
