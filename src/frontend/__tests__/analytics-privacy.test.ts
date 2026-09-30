import { beforeEach, expect, it, vi } from "vitest";
const client = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock("posthog-js", () => ({ default: client }));
vi.mock("posthog-js/react", () => ({ PostHogProvider: () => null }));
vi.mock("@/shared/config/env", () => ({
  getPublicEnv: () => ({ NEXT_PUBLIC_POSTHOG_KEY: "synthetic-test-key" }),
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: (run: () => unknown) => run(),
}));
import { PostHogProvider } from "@/frontend/providers/PostHogProvider";
beforeEach(() => vi.clearAllMocks());
it("disables automatic DOM capture and replay even with telemetry enabled", () => {
  PostHogProvider({ children: null });
  expect(client.init).toHaveBeenCalledWith(
    "synthetic-test-key",
    expect.objectContaining({
      autocapture: false,
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
    }),
  );
});
it("rejects generic events and removes sensitive capture properties from the allowlist", () => {
  PostHogProvider({ children: null });
  const filter = client.init.mock.calls[0][1].before_send;
  expect(
    filter({
      event: "$autocapture",
      properties: { $el_text: "PRIVATE TITLE" },
    }),
  ).toBeNull();
  expect(
    filter({
      event: "$pageview",
      properties: { $current_url: "https://example.test/home?secret=message" },
    }),
  ).toBeNull();
  expect(
    filter({
      event: "auth_sign_in_succeeded",
      properties: {
        distinct_id: "anonymous-id",
        title: "PRIVATE TITLE",
        $referrer: "secret-url",
      },
    }),
  ).toEqual({
    event: "auth_sign_in_succeeded",
    properties: { distinct_id: "anonymous-id" },
  });
});
