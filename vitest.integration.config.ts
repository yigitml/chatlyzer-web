import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "production",
      JWT_SECRET: "integration-only-jwt-secret-never-use-in-production",
      REFRESH_TOKEN_SECRET: "integration-only-refresh-secret-never-use-in-production",
      OPENAI_API_KEY: "integration-mocked-openai",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "integration.apps.googleusercontent.com",
      REVENUECAT_SECRET_API_KEY: "integration-mocked-revenuecat",
      REVENUECAT_WEBHOOK_SECRET: "integration-webhook-authorization",
    },
  },
});
