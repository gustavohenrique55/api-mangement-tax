import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { ProblemDetailsFilter } from "./platform/problem-details.filter";

async function bootstrap(): Promise<void> {
  const authMode = process.env.AUTH_MODE ?? "synthetic";
  if (process.env.NODE_ENV === "production" && authMode === "synthetic") {
    throw new Error("AUTH_MODE=synthetic is forbidden in production");
  }
  if (process.env.NODE_ENV === "production" && !process.env.AUDIT_HMAC_KEY) {
    throw new Error("AUDIT_HMAC_KEY is required in production");
  }

  const app = await NestFactory.create(AppModule, { cors: false });
  app.use(helmet());
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
}

void bootstrap();
