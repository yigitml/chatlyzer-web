import { afterEach, expect, it, vi } from "vitest";
const configure = vi.hoisted(() => vi.fn());
vi.mock("@revenuecat/purchases-js", () => ({
  Purchases: { configure, isConfigured: () => false },
  PurchasesError: class extends Error {},
  ErrorCode: { UserCancelledError: "cancelled" },
}));
import { purchaseRevenueCatCredits, revenueCatCheckoutAvailable } from "../lib/revenueCatWeb";
afterEach(() => vi.unstubAllEnvs());
it("blocks sandbox checkout in a production build before contacting the billing SDK", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_REVENUECAT_WEB_API_KEY", "rcb_sb_fixture");
  expect(revenueCatCheckoutAvailable()).toBe(false);
  await expect(purchaseRevenueCatCredits({ id: "fixture" } as never)).rejects.toThrow("unavailable");
  expect(configure).not.toHaveBeenCalled();
});
it("allows sandbox checkout only in development and recognizes live keys", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_REVENUECAT_WEB_API_KEY", "rcb_sb_fixture");
  expect(revenueCatCheckoutAvailable()).toBe(true);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_REVENUECAT_WEB_API_KEY", "rcb_live_fixture");
  expect(revenueCatCheckoutAvailable()).toBe(true);
});
