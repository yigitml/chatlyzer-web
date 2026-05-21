import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp } from "../rateLimiter";

function requestWithHeaders(headers: Record<string, string>) {
  return new NextRequest("https://chatlyzerai.com/api/auth/web", {
    headers,
  });
}

describe("getClientIp", () => {
  it("prefers Cloudflare client IP over proxy headers", () => {
    const request = requestWithHeaders({
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      "x-real-ip": "127.0.0.1",
    });

    expect(getClientIp(request)).toBe("203.0.113.10");
  });

  it("uses the first forwarded IP and strips IPv4 ports", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "198.51.100.25:53122, 10.0.0.2",
    });

    expect(getClientIp(request)).toBe("198.51.100.25");
  });

  it("falls back to x-real-ip when forwarded headers are absent", () => {
    const request = requestWithHeaders({
      "x-real-ip": "198.51.100.40",
    });

    expect(getClientIp(request)).toBe("198.51.100.40");
  });
});
