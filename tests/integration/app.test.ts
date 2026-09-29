import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// These tests use real PostgreSQL, migrations, route handlers, JWTs and rate
// limiting. Only the external Google/OpenAI/RevenueCat services are simulated.
const external = vi.hoisted(() => ({ completion: vi.fn(), google: vi.fn() }));
vi.mock("openai", () => ({ OpenAI: class {
  chat = { completions: { create: external.completion } };
} }));
vi.mock("@/backend/lib/verifyGoogleIdToken", () => ({ verifyGoogleIdToken: external.google }));

type Handler = (req: NextRequest) => Promise<NextResponse>;
let prisma: any;
let pool: Pool;
let routes: Record<string, Partial<Record<"GET" | "POST" | "PUT" | "DELETE", Handler>>>;
let cookie: string;
let refreshCookie: string;
let userId: string;
let chatId: string;
let analysisIds: string[];
let mobileToken: string;
let mobileRefresh: string;
let messageId: string;
let requestNumber = 0;
const email = `cloud-test-${Date.now()}@example.invalid`;
const messages = [
  { sender: "Alex", content: "Would you like to go for a walk tomorrow?", timestamp: "2026-01-01T12:00:00Z" },
  { sender: "Sam", content: "Yes, that sounds lovely. Let's meet at the park.", timestamp: "2026-01-01T12:01:00Z" },
];

// Produce a schema-valid deterministic provider response, not a real AI analysis.
function sample(schema: any): any {
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.anyOf) return sample(schema.anyOf.find((s: any) => s.type !== "null"));
  if (schema.type === "object") return Object.fromEntries(Object.entries(schema.properties || {}).map(([k, v]) => [k, sample(v)]));
  if (schema.type === "array") return [sample(schema.items)];
  if (schema.type === "number" || schema.type === "integer") return 1;
  if (schema.type === "boolean") return true;
  if (schema.type === "null") return null;
  return "Test fixture";
}

async function call(path: string, method = "GET", body?: unknown, auth = cookie, extra: Record<string, string> = {}) {
  const route = path.split("?")[0];
  const request = new NextRequest(`https://cloud-test.example/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-forwarded-for": `192.0.2.${++requestNumber}`, ...(auth ? { cookie: auth } : {}), ...extra },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return routes[route][method as "GET"]!(request);
}

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL || "http://missing");
  if (!url.pathname.endsWith("_test")) throw new Error("Integration tests require a dedicated DATABASE_URL ending in _test");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  prisma = (await import("../../src/backend/lib/prisma")).default;
  routes = {
    "auth/web": await import("../../src/app/api/auth/web/route"),
    "auth/web/refresh": await import("../../src/app/api/auth/web/refresh/route"),
    "auth/web/logout": await import("../../src/app/api/auth/web/logout/route"),
    "auth/mobile": await import("../../src/app/api/auth/mobile/route"),
    "auth/mobile/refresh": await import("../../src/app/api/auth/mobile/refresh/route"),
    "auth/mobile/logout": await import("../../src/app/api/auth/mobile/logout/route"),
    user: await import("../../src/app/api/user/route"),
    chat: await import("../../src/app/api/chat/route"),
    message: await import("../../src/app/api/message/route"),
    analysis: await import("../../src/app/api/analysis/route"),
    "privacy-analysis": await import("../../src/app/api/privacy-analysis/route"),
    credit: await import("../../src/app/api/credit/route"),
    subscription: await import("../../src/app/api/subscription/route"),
    order: await import("../../src/app/api/order/route"),
    file: await import("../../src/app/api/file/route"),
    checkout: await import("../../src/app/api/checkout/route"),
    health: { GET: (await import("../../src/app/api/health/route")).GET },
    "purchase/revenuecat/sync": await import("../../src/app/api/purchase/revenuecat/sync/route"),
    "webhook/revenuecat": await import("../../src/app/api/webhook/revenuecat/route"),
  };
  external.google.mockResolvedValue({ email, name: "Cloud Test", id: "google-test" });
  external.completion.mockImplementation(async (request: any) => ({ choices: [{ message: { content: JSON.stringify(sample(request.response_format.json_schema.schema)) } }] }));
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    if (input.includes("googleapis.com")) return Response.json({ email, name: "Cloud Test", sub: "google-test", email_verified: true });
    if (input.includes("api.revenuecat.com")) return Response.json({ subscriber: { non_subscriptions: { credits_24: [{ id: `purchase-${userId}`, product_id: "credits_24", store: "rc_billing", purchase_date: "2026-01-01T12:00:00Z" }] } } });
    throw new Error(`Unexpected external request: ${input}`);
  }));
});

afterAll(async () => {
  vi.unstubAllGlobals();
  if (userId) {
    for (const table of ["Analysis", "Message", "File", "Chat", "RevenueCatPurchase", "Order", "UserCredit", "Subscription", "UserSession", "UserDevice"])
      await pool.query(`DELETE FROM "${table}" WHERE "userId" = $1`, [userId]);
    await pool.query('DELETE FROM "User" WHERE id = $1', [userId]);
  }
  await prisma?.$disconnect();
  await pool?.end();
  await (globalThis as any).rateLimitPool?.end();
});

describe.sequential("Fresh cloud database application workflows", () => {
  it("health checks PostgreSQL and protected routes reject anonymous users", async () => {
    expect((await call("health", "GET", undefined, "")).status).toBe(200);
    expect((await call("user", "GET", undefined, "")).status).toBe(401);
  });
  it("web login provisions account and sets secure HttpOnly cookies", async () => {
    const response = await call("auth/web", "POST", { accessToken: "simulated-google-token", sessionId: "cloud-test-session" }, "");
    expect(response.status).toBe(200);
    userId = (await response.json()).data.user.id;
    const cookies = response.headers.getSetCookie();
    expect(cookies.every(c => c.includes("HttpOnly") && c.includes("Secure") && c.includes("SameSite=Strict"))).toBe(true);
    cookie = cookies.find(c => c.startsWith("accessToken="))!.split(";")[0];
    refreshCookie = cookies.find(c => c.startsWith("refreshToken="))!.split(";")[0];
    expect(await prisma.userCredit.count({ where: { userId } })).toBe(1);
  });
  it("reads and updates profile without exposing token internals", async () => {
    expect((await (await call("user")).json()).data).not.toHaveProperty("tokenVersion");
    const response = await call("user", "PUT", { name: "Cloud Updated", isOnboarded: true });
    expect((await response.json()).data.name).toBe("Cloud Updated");
  });
  it("refreshes web authentication", async () => {
    const response = await call("auth/web/refresh", "POST", undefined, refreshCookie);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("accessToken=");
  });
  it("imports, paginates, and renames a chat", async () => {
    const response = await call("chat", "POST", { title: "Cloud chat", messages });
    expect(response.status).toBe(200);
    chatId = (await response.json()).data.id;
    expect((await (await call(`message?chatId=${chatId}`)).json()).data).toHaveLength(2);
    expect((await (await call("chat?limit=1")).json()).data).toHaveLength(1);
    expect((await call("chat", "PUT", { id: chatId, title: "Renamed cloud chat" })).status).toBe(200);
  });
  it("creates, edits and deletes messages", async () => {
    const created = await call("message", "POST", { chatId, sender: "Alex", content: "See you tomorrow!" });
    expect(created.status).toBe(201);
    messageId = (await created.json()).data.id;
    expect((await call("message", "PUT", { id: messageId, content: "See you at noon!" })).status).toBe(200);
    expect((await call("message", "DELETE", { id: messageId })).status).toBe(200);
    expect((await (await call(`message?chatId=${chatId}`)).json()).data).toHaveLength(2);
  });
  it("rejects analysis when credits are insufficient", async () => {
    expect((await call("analysis", "POST", { chatId })).status).toBe(402);
  });
  it("syncs a simulated purchase exactly once", async () => {
    const first = await call("purchase/revenuecat/sync", "POST", {});
    expect(first.status).toBe(200);
    expect((await prisma.userCredit.findFirst({ where: { userId } })).amount).toBe(24);
    expect((await call("purchase/revenuecat/sync", "POST", {})).status).toBe(200);
    expect((await prisma.userCredit.findFirst({ where: { userId } })).amount).toBe(24);
  });
  it("authenticates RevenueCat webhooks and replays without duplicate credits", async () => {
    const body = { event: { id: "test-event", type: "NON_RENEWING_PURCHASE", app_user_id: userId } };
    expect((await call("webhook/revenuecat", "POST", body, "")).status).toBe(401);
    const response = await call("webhook/revenuecat", "POST", body, "", { authorization: "integration-webhook-authorization" });
    expect(response.status).toBe(200);
    expect((await response.json()).creditsGranted).toBe(0);
  });
  it("persists all eight analyses and handles retries without charging twice", async () => {
    const response = await call("analysis", "POST", { chatId, requestKey: "cloud-analysis" });
    expect(response.status).toBe(200);
    const analyses = (await response.json()).data;
    expect(analyses).toHaveLength(8);
    expect(analyses.every((a: any) => a.status === "COMPLETED")).toBe(true);
    expect(new Set(analyses.map((a: any) => a.result.type)).size).toBe(8);
    analysisIds = analyses.map((a: any) => a.id);
    const retry = await call("analysis", "POST", { chatId, requestKey: "cloud-analysis" });
    expect(retry.status).toBe(200);
    expect((await prisma.userCredit.findFirst({ where: { userId } })).amount).toBe(16);
    expect((await (await call(`analysis?chatId=${chatId}`)).json()).data).toHaveLength(8);
  });
  it("privacy mode stores results but never conversation messages", async () => {
    const response = await call("privacy-analysis", "POST", { title: "Private cloud chat", isGhostMode: false, requestKey: "private-cloud", messages });
    expect(response.status).toBe(200);
    const result = (await response.json()).data;
    expect(result.analyses).toHaveLength(8);
    expect(await prisma.message.count({ where: { chatId: result.chat.id } })).toBe(0);
  });
  it("retries privacy analysis without charging twice or duplicating results", async () => {
    const before = (await prisma.userCredit.findFirst({ where: { userId } })).amount;
    const response = await call("privacy-analysis", "POST", { title: "Private cloud chat", isGhostMode: false, requestKey: "private-cloud", messages });
    expect(response.status).toBe(200);
    expect((await response.json()).data.analyses).toHaveLength(8);
    expect((await prisma.userCredit.findFirst({ where: { userId } })).amount).toBe(before);
  });
  it("ghost mode returns eight results without persisting chats or analyses", async () => {
    const before = await prisma.chat.count({ where: { userId } });
    const beforeAnalyses = await prisma.analysis.count({ where: { userId } });
    const response = await call("privacy-analysis", "POST", { title: "Ghost cloud chat", isGhostMode: true, messages });
    expect(response.status).toBe(200);
    expect((await response.json()).data.analyses).toHaveLength(8);
    expect(await prisma.chat.count({ where: { userId } })).toBe(before);
    expect(await prisma.analysis.count({ where: { userId } })).toBe(beforeAnalyses);
    expect((await prisma.userCredit.findFirst({ where: { userId } })).amount).toBe(0);
  });
  it("refunds credits and marks analyses failed when the AI provider fails", async () => {
    await prisma.userCredit.updateMany({ where: { userId }, data: { amount: 8 } });
    const created = await call("chat", "POST", { title: "Failure chat", messages });
    const failedChatId = (await created.json()).data.id;
    external.completion.mockRejectedValueOnce(new Error("Simulated provider outage"));
    expect((await call("analysis", "POST", { chatId: failedChatId })).status).toBe(500);
    expect((await prisma.userCredit.findFirst({ where: { userId } })).amount).toBe(8);
    const records = await prisma.analysis.findMany({ where: { chatId: failedChatId } });
    expect(records).toHaveLength(8);
    expect(records.every((a: any) => a.status === "FAILED")).toBe(true);
  });
  it("reads credits, subscription, order history and file metadata", async () => {
    for (const route of ["credit", "subscription", "order", "file"]) expect((await call(route)).status).toBe(200);
    expect((await call("checkout")).status).toBe(410);
  });
  it("deletes a chat and its analysis records", async () => {
    expect((await call("chat", "DELETE", { id: chatId })).status).toBe(200);
    expect((await call(`chat?id=${chatId}`)).status).toBe(404);
    expect(await prisma.analysis.count({ where: { id: { in: analysisIds }, deletedAt: null } })).toBe(0);
  });
  it("logs out web session and rejects its old tokens", async () => {
    expect((await call("auth/web/logout", "POST", {})).status).toBe(200);
    expect((await call("user")).status).toBe(401);
    expect((await call("auth/web/refresh", "POST", undefined, refreshCookie)).status).toBe(401);
  });
  it("allows web re-login with the same session identifier after logout", async () => {
    const response = await call("auth/web", "POST", { accessToken: "simulated-google-token", sessionId: "cloud-test-session" }, "");
    expect(response.status).toBe(200);
    cookie = response.headers.getSetCookie().find(c => c.startsWith("accessToken="))!.split(";")[0];
    expect((await call("user")).status).toBe(200);
  });
  it("supports mobile login, refresh rotation, and rejects replayed refresh tokens", async () => {
    const login = await call("auth/mobile", "POST", { accessToken: "simulated-id-token", deviceId: "cloud-mobile-device" }, "");
    expect(login.status).toBe(200);
    const data = (await login.json()).data;
    mobileToken = data.token;
    mobileRefresh = data.refreshToken;
    expect((await call("user", "GET", undefined, "", { authorization: `Bearer ${mobileToken}` })).status).toBe(200);
    expect((await call("auth/mobile/refresh", "POST", { refreshToken: mobileRefresh }, "")).status).toBe(200);
    expect((await call("auth/mobile/refresh", "POST", { refreshToken: mobileRefresh }, "")).status).toBe(401);
  });
  it("revokes mobile access on logout", async () => {
    expect((await call("auth/mobile/logout", "POST", {}, "", { authorization: `Bearer ${mobileToken}` })).status).toBe(200);
    expect((await call("user", "GET", undefined, "", { authorization: `Bearer ${mobileToken}` })).status).toBe(401);
  });
  it("account deletion revokes authentication and clears conversation content", async () => {
    expect((await call("user", "DELETE")).status).toBe(200);
    expect((await call("user")).status).toBe(401);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user.isActive).toBe(false);
    expect(user.email).toContain("deleted-");
    expect(await prisma.message.count({ where: { userId, content: { not: "" } } })).toBe(0);
  });
});
