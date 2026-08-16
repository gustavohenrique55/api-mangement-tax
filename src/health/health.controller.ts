import { Controller, Get } from "@nestjs/common";
import { Public } from "../security/public.decorator";

@Controller("v1/health")
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "api-management-tax",
      version: "0.1.0",
      time: new Date().toISOString(),
    };
  }
}
