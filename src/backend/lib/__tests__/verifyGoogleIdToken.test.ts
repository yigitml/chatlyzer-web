import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));
vi.mock("google-auth-library", () => ({ OAuth2Client: vi.fn(function () { return { verifyIdToken: mocks.verifyIdToken }; }) }));
import { verifyGoogleIdToken } from "../verifyGoogleIdToken";
const valid = () => ({ sub: "google-user-1", aud: "approved.apps.googleusercontent.com", iss: "https://accounts.google.com",
  exp: Math.floor(Date.now() / 1000) + 300, email: "user@example.com", email_verified: true, name: "Test User", picture: "https://example.com/avatar.png" });
describe("Google client binding", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "approved.apps.googleusercontent.com"); vi.stubEnv("GOOGLE_ALLOWED_CLIENT_IDS", ""); });
  afterEach(() => vi.unstubAllEnvs());
  it("passes required allowlisted audiences and returns stable subject identity", async () => {
    mocks.verifyIdToken.mockResolvedValue({ getPayload: valid });
    expect(await verifyGoogleIdToken("id-token")).toEqual({ id: "google-user-1", email: "user@example.com", name: "Test User", picture: "https://example.com/avatar.png" });
    expect(mocks.verifyIdToken).toHaveBeenCalledWith({ idToken: "id-token", audience: ["approved.apps.googleusercontent.com"] });
  });
  it.each([
    { aud: "foreign.apps.googleusercontent.com" }, { iss: "https://attacker.invalid" }, { exp: 1 }, { sub: "" }, { email_verified: false },
  ])("rejects validly signed credentials with unsafe claims %j", async (change) => {
    mocks.verifyIdToken.mockResolvedValue({ getPayload: () => ({ ...valid(), ...change }) });
    await expect(verifyGoogleIdToken("foreign-token")).rejects.toThrow("Unauthorized");
  });
  it("fails closed before verification when audience configuration is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    await expect(verifyGoogleIdToken("id-token")).rejects.toThrow("not configured");
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
  });
  it("requires the Google library to verify signatures", async () => {
    mocks.verifyIdToken.mockRejectedValue(new Error("Signature mismatch"));
    await expect(verifyGoogleIdToken("forged-token")).rejects.toThrow("Unauthorized");
  });
});
