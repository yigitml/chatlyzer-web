import { describe, expect, it, vi } from "vitest";

vi.mock("@/backend/lib/prisma", () => ({
  default: {},
}));

vi.mock("@/backend/lib/consumeUserCredits", () => ({
  grantUserCredits: vi.fn(),
}));

vi.mock("@/shared/config/env", () => ({
  getRequiredServerEnv: vi.fn(),
}));

import { getRevenueCatWebhookUserIds } from "../revenueCat";

describe("getRevenueCatWebhookUserIds", () => {
  it("returns unique RevenueCat user ids from app user id, original id, and aliases", () => {
    expect(
      getRevenueCatWebhookUserIds({
        event: {
          app_user_id: "user_1",
          original_app_user_id: "user_0",
          aliases: ["user_1", "user_2"],
        },
      }),
    ).toEqual(["user_1", "user_0", "user_2"]);
  });

  it("returns an empty list for webhook events without an app user id", () => {
    expect(getRevenueCatWebhookUserIds({ event: { type: "TRANSFER" } })).toEqual([]);
  });
});
