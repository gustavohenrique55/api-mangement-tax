import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const supplied = request.header("x-correlation-id");
    const correlationId =
      supplied && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied)
        ? supplied
        : randomUUID();
    request.correlationId = correlationId;
    response.setHeader("x-correlation-id", correlationId);
    next();
  }
}
