import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

afterEach(() => vi.unstubAllEnvs());
it("serves security headers without Nginx", () => {
  vi.stubEnv("NODE_ENV", "production");
  const response = proxy(new NextRequest("https://chatlyzer.onrender.com/"));
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("strict-transport-security")).toBe("max-age=31536000");
  expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  expect(response.headers.get("cross-origin-opener-policy")).toBe("same-origin-allow-popups");
});
it("allows configured clients and rejects arbitrary cross-origin access", () => {
  vi.stubEnv("CORS_ALLOWED_ORIGINS", "https://mobile.example.com");
  for (const origin of ["https://mobile.example.com", "https://attacker.example.com"]) {
    const response = proxy(new NextRequest("https://chatlyzer.onrender.com/api/chat", { method: "OPTIONS", headers: { origin } }));
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin.includes("attacker") ? null : origin);
    expect(response.headers.get("vary")).toContain("Origin");
  }
});
