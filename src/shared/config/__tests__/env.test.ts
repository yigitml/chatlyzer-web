import { describe, expect, it } from "vitest";
import { getPublicEnv, getRequiredServerEnv } from "../env";

describe("web env", () => {
  it("allows optional public analytics env to be absent", () => {
    expect(getPublicEnv({})).toEqual({});
  });

  it("throws a clear error for a missing required server value", () => {
    expect(() => getRequiredServerEnv("DATABASE_URL", {})).toThrow(
      "DATABASE_URL is required",
    );
  });
});
