import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.spec.ts"],
    exclude: ["dashboard/**", "dist/**", "node_modules/**"],
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
});
