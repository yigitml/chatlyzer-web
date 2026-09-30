import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp } from "../rateLimiter";
function request(headers: Record<string, string>) { return new NextRequest("https://chatlyzerai.com/api/auth/web", { headers }); }
afterEach(() => vi.unstubAllEnvs());
describe("trusted ingress IP contract", () => {
  it("ignores every caller IP header unless ingress trust is explicitly configured", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "");
    expect(getClientIp(request({ "cf-connecting-ip": "203.0.113.1", "x-forwarded-for": "198.51.100.2", "x-real-ip": "192.0.2.3" }))).toBe("unknown");
  });
  it("uses only the configured overwritten header", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "x-forwarded-for");
    expect(getClientIp(request({ "cf-connecting-ip": "spoof", "x-forwarded-for": "198.51.100.25:53122, 10.0.0.2" }))).toBe("198.51.100.25");
  });
  it.each(["arbitrary-key", "999.0.0.1", "", "1.2.3", "[not-an-ip]"])("rejects invalid IP bucket %s", value => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "cf-connecting-ip");
    expect(getClientIp(request({ "cf-connecting-ip": value }))).toBe("unknown");
  });
  it("accepts valid bracketed IPv6 without accepting other header families", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "x-real-ip");
    expect(getClientIp(request({ "x-real-ip": "[2001:db8::1]:443" }))).toBe("2001:db8::1");
  });
});
