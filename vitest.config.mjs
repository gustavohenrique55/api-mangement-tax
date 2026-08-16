import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.spec.ts"],
    exclude: ["dashboard/**", "dist/**", "node_modules/**"],
  },
});
