import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn(function OAuth2Client() {
    return {
      verifyIdToken: mocks.verifyIdToken,
    };
  }),
}));

import { verifyGoogleIdToken } from "../verifyGoogleIdToken";

describe("verifyGoogleIdToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user info for verified Google email payloads", async () => {
    mocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-user-1",
        email: "user@example.com",
        email_verified: true,
        name: "Test User",
        picture: "https://example.com/avatar.png",
      }),
    });

    await expect(verifyGoogleIdToken("id-token")).resolves.toEqual({
      id: "google-user-1",
      email: "user@example.com",
      name: "Test User",
      picture: "https://example.com/avatar.png",
    });
  });

  it("rejects unverified Google email payloads", async () => {
    mocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-user-1",
        email: "user@example.com",
        email_verified: false,
        name: "Test User",
      }),
    });

    await expect(verifyGoogleIdToken("id-token")).rejects.toThrow("Unauthorized");
  });
});
