import { describe, expect, it } from "vitest";
import {
  getPublicEnv,
  getRequiredServerEnv,
  validateProductionServerEnv,
} from "../env";

describe("web env", () => {
  it("allows optional public analytics env to be absent", () => {
    expect(getPublicEnv({})).toEqual({});
  });

  it("throws a clear error for a missing required server value", () => {
    expect(() => getRequiredServerEnv("DATABASE_URL", {})).toThrow(
      "DATABASE_URL is required",
    );
  });

  it("requires RevenueCat payment and webhook settings in production", () => {
    expect(() =>
      validateProductionServerEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://example",
        JWT_SECRET: "jwt",
        REFRESH_TOKEN_SECRET: "refresh",
        OPENAI_API_KEY: "openai",
      }),
    ).toThrow("REVENUECAT_SECRET_API_KEY is required");
  });
});
