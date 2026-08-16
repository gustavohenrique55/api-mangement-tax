import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url:
      process.env.MIGRATION_DATABASE_URL ??
      "postgresql://postgres:local_postgres_only@localhost:55432/api_management_tax?schema=public",
  },
});
