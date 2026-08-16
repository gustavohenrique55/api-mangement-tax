import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";

@Controller("v1/identity-context")
export class IdentityController {
  @Get()
  getContext(@Req() request: Request) {
    return {
      companyDisplayName:
        process.env.COMPANY_DISPLAY_NAME ?? "Empresa Confidencial",
      ...request.actor,
      authenticationMode: process.env.AUTH_MODE ?? "synthetic",
    };
  }
}
