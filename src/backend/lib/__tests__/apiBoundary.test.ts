import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readJson, apiErrorResponse } from "../apiBoundary";
import { combineMiddleware } from "@/backend/middleware/combinedMiddleware";
describe("API error boundary", () => {
  it("reports malformed JSON as a client error", async () => {
    const req = new NextRequest("https://app.invalid/api/user", { method: "PUT", headers: { "content-type": "application/json" }, body: "{" });
    await expect(readJson(req)).rejects.toMatchObject({ status: 400 });
  });
  it("bounds actual bytes even without content-length", async () => {
    const req = new NextRequest("https://app.invalid/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "long payload" }) });
    await expect(readJson(req, 10)).rejects.toMatchObject({ status: 413 });
  });
  it("rejects simple-request text/plain JSON", async () => {
    const req = new NextRequest("https://app.invalid/api/auth/web", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
    await expect(readJson(req)).rejects.toMatchObject({ status: 415 });
  });
  it("maps scoped missing writes to 404", () => { expect(apiErrorResponse({ code: "P2025" }).status).toBe(404); });
  it("contains middleware database exceptions in an API envelope", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = combineMiddleware(async () => { throw new Error("database failure with sensitive values"); })(async () => { throw new Error("unreachable"); });
    const response = await route(new NextRequest("https://app.invalid/api/user"));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ success: false });
    expect(error.mock.calls.flat().join(" ")).not.toContain("sensitive values");
    error.mockRestore();
  });
});
