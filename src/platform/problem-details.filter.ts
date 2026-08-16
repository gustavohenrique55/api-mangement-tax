import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw =
      error instanceof HttpException ? error.getResponse() : undefined;
    const message =
      typeof raw === "string"
        ? raw
        : raw && typeof raw === "object" && "message" in raw
          ? (raw as { message: string | string[] }).message
          : status === 500
            ? "Internal server error"
            : "Request failed";

    response
      .status(status)
      .type("application/problem+json")
      .send({
        type: `https://api.management-tax.local/problems/http-${status}`,
        title: HttpStatus[status] ?? "Error",
        status,
        detail: Array.isArray(message) ? message.join("; ") : message,
        instance: request.originalUrl,
        correlationId: request.correlationId,
      });
  }
}
