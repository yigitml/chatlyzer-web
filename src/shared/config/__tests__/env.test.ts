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

const validProduction = {
  NODE_ENV: "production", DATABASE_URL: "postgresql://fixture@127.0.0.1:5432/config_test",
  JWT_SECRET: "f6423c27892e0549c73847f18a3e212799", REFRESH_TOKEN_SECRET: "01f4ca3834370b894ab256834c805863",
  REVENUECAT_WEBHOOK_SECRET: "07f9a67a9c01f4bbc9c8d1da93a45676",
  OPENAI_API_KEY: "synthetic-openai", REVENUECAT_SECRET_API_KEY: "synthetic-revenuecat",
  NEXT_PUBLIC_REVENUECAT_WEB_API_KEY: "synthetic-web-key", NEXT_PUBLIC_GOOGLE_CLIENT_ID: "fixture.apps.googleusercontent.com",
};
it("accepts strong independent production secrets and defaults to paid credits", () => {
  expect(validateProductionServerEnv(validProduction).REVENUECAT_FULFILLMENT_MODE).toBe("production");
});
it.each([
  { JWT_SECRET: "x" }, { REFRESH_TOKEN_SECRET: validProduction.JWT_SECRET },
  { DATABASE_URL: "not-a-database" }, { DATABASE_URL: "mysql://localhost/db" },
  { REVENUECAT_CREDITS_PER_PURCHASE: "-24" }, { REVENUECAT_FULFILLMENT_MODE: "live" },
  { TRUSTED_CLIENT_IP_HEADER: "attacker-header" },
])("rejects unsafe release configuration %j", patch => {
  expect(() => validateProductionServerEnv({ ...validProduction, ...patch })).toThrow();
});
it("keeps short synthetic credentials usable in development", () => {
  expect(validateProductionServerEnv({ ...validProduction, NODE_ENV: "development", JWT_SECRET: "test" }).JWT_SECRET).toBe("test");
});
