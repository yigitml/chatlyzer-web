import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Pool } from "pg";
import jwt from "jsonwebtoken";
const external = vi.hoisted(() => ({ google: vi.fn() }));
vi.mock("@/backend/lib/verifyGoogleIdToken", () => ({ verifyGoogleIdToken: external.google }));
let protectedDb: typeof import("../../src/backend/lib/prisma").default;
let db: typeof import("../../src/backend/lib/prisma").rawPrisma;
let routes: Record<string, any>;
let pool: Pool;
const ids = new Set<string>();
let counter = 0;
const prefix = `auth-regression-${Date.now()}`;
const identity = (suffix: string) => ({ id: `${prefix}-${suffix}`, email: `${prefix}-${suffix}@example.invalid`, name: "Synthetic User" });
const cookieOf = (response: Response, name: string) => response.headers.getSetCookie().find(value => value.startsWith(`${name}=`))!.split(";")[0];
async function call(route: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) {
  return routes[route.split("?")[0]][method](new NextRequest(`https://auth-regression.invalid/api/${route}`, {
    method, headers: { "content-type": "application/json", origin: "https://auth-regression.invalid", "x-forwarded-for": `198.18.${Math.floor(++counter / 250)}.${counter % 250 + 1}`, ...headers },
    ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
  }));
}
async function web(suffix: string, sessionId = "shared-web-session") {
  external.google.mockResolvedValue(identity(suffix));
  const handshake = await call("auth/web");
  const csrfToken = (await handshake.json()).data.csrfToken;
  const response = await call("auth/web", "POST", { idToken: "approved-id-token", sessionId }, { cookie: `loginCsrf=${csrfToken}`, "x-csrf-token": csrfToken });
  const body = await response.json();
  if (body.data?.user?.id) ids.add(body.data.user.id);
  return { response, body, access: response.status === 200 ? cookieOf(response, "accessToken") : "", refresh: response.status === 200 ? cookieOf(response, "refreshToken") : "" };
}
async function mobile(suffix: string) {
  external.google.mockResolvedValue(identity(suffix));
  const response = await call("auth/mobile", "POST", { accessToken: "approved-id-token", deviceId: "shared-mobile-device" });
  const body = await response.json();
  if (body.data?.user?.id) ids.add(body.data.user.id);
  return { response, body, refresh: response.status === 200 ? cookieOf(response, "refreshToken") : "" };
}
function failNextTransaction(model: string, operation: string) {
  const real = db.$transaction.bind(db) as any;
  vi.spyOn(db, "$transaction").mockImplementationOnce(((callback: any, options: any) => real(async (tx: any) => {
    vi.spyOn(tx[model], operation).mockRejectedValueOnce(new Error("Injected database interruption"));
    return callback(tx);
  }, options)) as any);
}
beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL || "http://missing").pathname.endsWith("_test")) throw new Error("Disposable _test database required");
  vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "x-forwarded-for");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://auth-regression.invalid");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  protectedDb = (await import("../../src/backend/lib/prisma")).default;
  db = (await import("../../src/backend/lib/prisma")).rawPrisma;
  routes = { "auth/web": await import("../../src/app/api/auth/web/route"), "auth/web/refresh": await import("../../src/app/api/auth/web/refresh/route"),
    "auth/web/logout": await import("../../src/app/api/auth/web/logout/route"), "auth/mobile": await import("../../src/app/api/auth/mobile/route"),
    "auth/mobile/refresh": await import("../../src/app/api/auth/mobile/refresh/route"), "auth/mobile/logout": await import("../../src/app/api/auth/mobile/logout/route"),
    user: await import("../../src/app/api/user/route"), chat: await import("../../src/app/api/chat/route"), message: await import("../../src/app/api/message/route"), file: await import("../../src/app/api/file/route") };
});
beforeEach(async () => { await pool.query("DELETE FROM rate_limits"); });
afterEach(() => { vi.restoreAllMocks(); });
afterAll(async () => {
  for (const userId of ids) {
    for (const table of ["AnalysisJob", "Analysis", "Message", "File", "Chat", "RevenueCatPurchase", "Order", "UserCredit", "Subscription", "UserSession", "UserDevice"]) await pool.query(`DELETE FROM "${table}" WHERE "userId" = $1`, [userId]);
    await pool.query('DELETE FROM "User" WHERE id = $1', [userId]);
  }
  vi.unstubAllEnvs();
  await db?.$disconnect(); await pool?.end(); await (globalThis as any).rateLimitPool?.end();
});

describe.sequential("Authentication and erasure invariants with real PostgreSQL", () => {
  it("rejects attacker origins, text/plain exchange and missing browser state before identity verification", async () => {
    external.google.mockClear();
    expect((await call("auth/web", "POST", { idToken: "token", sessionId: "session-123" }, { origin: "https://attacker.invalid" })).status).toBe(403);
    expect((await call("auth/web", "POST", { idToken: "token", sessionId: "session-123" })).status).toBe(403);
    const handshake = await call("auth/web"); const csrfToken = (await handshake.json()).data.csrfToken;
    expect((await call("auth/web", "POST", { idToken: "token", sessionId: "session-123" }, { cookie: `loginCsrf=${csrfToken}`, "x-csrf-token": csrfToken, "content-type": "text/plain" })).status).toBe(415);
    expect(external.google).not.toHaveBeenCalled();
  });
  it("enforces the production auth threshold despite random unsupported client IP headers", async () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "none");
    try {
      for (let index = 0; index < 30; index++) expect((await call("auth/web", "GET", undefined, { "cf-connecting-ip": `caller-controlled-${index}` })).status).toBe(200);
      expect((await call("auth/web", "GET", undefined, { "cf-connecting-ip": "new-arbitrary-bucket" })).status).toBe(429);
    } finally { vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "x-forwarded-for"); }
  });
  it("provisions concurrent first Google subject logins into one complete account", async () => {
    const result = await Promise.all([mobile("concurrent"), mobile("concurrent")]);
    expect(result.map(value => value.response.status)).toEqual([200, 200]);
    const userId = result[0].body.data.user.id;
    expect(result[1].body.data.user.id).toBe(userId);
    expect(await db.subscription.count({ where: { userId } })).toBe(1);
    expect(await db.userCredit.count({ where: { userId } })).toBe(1);
  });
  it("rolls back failed signup and repairs legacy incomplete provisioning without adding duplicate grants", async () => {
    failNextTransaction("subscription", "upsert");
    expect((await mobile("failed-signup")).response.status).toBe(500);
    expect(await db.user.count({ where: { googleId: identity("failed-signup").id } })).toBe(0);
    failNextTransaction("userCredit", "upsert");
    expect((await mobile("failed-credit-signup")).response.status).toBe(500);
    expect(await db.user.count({ where: { googleId: identity("failed-credit-signup").id } })).toBe(0);
    const user = await db.user.create({ data: { name: "Legacy", email: identity("legacy").email, googleId: identity("legacy").id } }); ids.add(user.id);
    expect((await mobile("legacy")).response.status).toBe(200);
    expect((await mobile("legacy")).response.status).toBe(200);
    expect(await db.subscription.count({ where: { userId: user.id } })).toBe(1);
    expect(await db.userCredit.count({ where: { userId: user.id } })).toBe(1);
  });
  it("consumes a mobile refresh generation once under concurrent requests and replaces the cookie twice", async () => {
    const login = await mobile("mobile-rotation");
    const results = await Promise.all([call("auth/mobile/refresh", "POST", undefined, { cookie: login.refresh }), call("auth/mobile/refresh", "POST", undefined, { cookie: login.refresh })]);
    expect(results.map(value => value.status).sort()).toEqual([200, 401]);
    const successor = cookieOf(results.find(value => value.status === 200)!, "refreshToken");
    const second = await call("auth/mobile/refresh", "POST", undefined, { cookie: successor });
    expect(second.status).toBe(200);
    expect(cookieOf(second, "refreshToken")).not.toBe(successor);
    expect((await call("auth/mobile/refresh", "POST", undefined, { cookie: successor })).status).toBe(401);
  });
  it("never lets a concurrent device login revive a consumed refresh generation", async () => {
    const first = await mobile("mobile-login-race");
    const [login, refreshed] = await Promise.all([mobile("mobile-login-race"), call("auth/mobile/refresh", "POST", undefined, { cookie: first.refresh })]);
    expect(login.response.status).toBe(200);
    expect([200, 401]).toContain(refreshed.status);
    expect((await call("user", "GET", undefined, { authorization: `Bearer ${login.body.data.token}` })).status).toBe(200);
    expect((await call("auth/mobile/refresh", "POST", undefined, { cookie: first.refresh })).status).toBe(401);
    if (refreshed.status === 200) {
      const result = (await refreshed.json()).data;
      expect((await call("user", "GET", undefined, { authorization: `Bearer ${result.token}` })).status).toBe(401);
    }
  });
  it("permanently revokes mobile access and refresh across device re-login", async () => {
    const first = await mobile("mobile-relogin");
    const auth = { authorization: `Bearer ${first.body.data.token}` };
    expect((await call("auth/mobile/logout", "POST", {}, auth)).status).toBe(200);
    expect((await mobile("mobile-relogin")).response.status).toBe(200);
    expect((await call("user", "GET", undefined, auth)).status).toBe(401);
    expect((await call("auth/mobile/refresh", "POST", undefined, { cookie: first.refresh })).status).toBe(401);
  });
  it("rotates web refresh atomically and keeps logged-out generations dead after reused-session login", async () => {
    const first = await web("web-rotation");
    const results = await Promise.all([call("auth/web/refresh", "POST", undefined, { cookie: first.refresh }), call("auth/web/refresh", "POST", undefined, { cookie: first.refresh })]);
    expect(results.map(value => value.status).sort()).toEqual([200, 401]);
    const rotated = results.find(value => value.status === 200)!;
    expect((await call("auth/web/logout", "POST", {}, { cookie: first.access })).status).toBe(200);
    expect((await web("web-rotation")).response.status).toBe(200);
    expect((await call("user", "GET", undefined, { cookie: first.access })).status).toBe(401);
    expect((await call("auth/web/refresh", "POST", undefined, { cookie: cookieOf(rotated, "refreshToken") })).status).toBe(401);
  });
  it("browser logout refreshes expired access before revoking the permanent generation and clearing path-scoped cookies", async () => {
    const session = await web("expired-browser-logout");
    const claims = jwt.decode(session.access.slice("accessToken=".length)) as jwt.JwtPayload;
    const expired = jwt.sign({ userId: claims.userId, email: claims.email, tokenVersion: claims.tokenVersion,
      isMobile: false, sessionId: claims.sessionId, loginGeneration: claims.loginGeneration }, process.env.JWT_SECRET!, { expiresIn: -1 });
    const jar = new Map<string, { value: string; path: string }>([
      ["accessToken", { value: expired, path: "/" }],
      ["refreshToken", { value: session.refresh.slice("refreshToken=".length), path: "/api/auth/web/refresh" }],
    ]);
    const visited: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(input, "https://auth-regression.invalid");
      visited.push(url.pathname);
      const headers = new Headers(init.headers);
      headers.set("origin", url.origin); headers.set("x-forwarded-for", `198.19.0.${++counter % 250 + 1}`);
      headers.set("cookie", [...jar].filter(([, cookie]) => url.pathname.startsWith(cookie.path)).map(([name, cookie]) => `${name}=${cookie.value}`).join("; "));
      const response = await routes[url.pathname.slice("/api/".length)][init.method || "GET"](new NextRequest(url, { method: init.method, headers, ...(init.body != null ? { body: init.body } : {}), ...(init.signal ? { signal: init.signal } : {}) }));
      for (const cookie of response.headers.getSetCookie()) {
        const parts = cookie.split(";").map((part: string) => part.trim());
        const separator = parts[0].indexOf("="); const name = parts[0].slice(0, separator);
        if (parts.includes("Max-Age=0")) jar.delete(name);
        else jar.set(name, { value: parts[0].slice(separator + 1), path: parts.find((part: string) => part.startsWith("Path="))?.slice(5) || "/" });
      }
      return response;
    }));
    try {
      const { createNetworkService } = await import("../../src/shared/utils/network");
      await createNetworkService(() => null).logout();
      expect(visited).toEqual(["/api/auth/web/logout", "/api/auth/web/refresh", "/api/auth/web/logout"]);
      expect(jar.has("accessToken")).toBe(false); expect(jar.has("refreshToken")).toBe(false);
      expect((await db.userSession.findFirstOrThrow({ where: { userId: session.body.data.user.id, sessionId: "shared-web-session" } })).deletedAt).not.toBeNull();
      expect((await call("auth/web/refresh", "POST", undefined, { cookie: session.refresh })).status).toBe(401);
      expect((await web("expired-browser-logout")).response.status).toBe(200);
      expect((await call("user", "GET", undefined, { cookie: session.access })).status).toBe(401);
    } finally { vi.unstubAllGlobals(); }
  });
  it("rolls back chat and messages together then permits retry and equal-title conversations", async () => {
    const session = await web("import"); const auth = { cookie: session.access };
    const input = { title: "same title", messages: [{ sender: "Private Person", content: "sensitive", timestamp: new Date().toISOString() }] };
    failNextTransaction("message", "createMany");
    expect((await call("chat", "POST", input, auth)).status).toBe(500);
    expect(await db.chat.count({ where: { userId: session.body.data.user.id } })).toBe(0);
    expect((await call("chat", "POST", input, auth)).status).toBe(200);
    expect((await call("chat", "POST", input, auth)).status).toBe(200);
    expect(await db.chat.count({ where: { userId: session.body.data.user.id } })).toBe(2);
  });
  it("makes every chat beyond the first 50 accessible with stable cursor metadata", async () => {
    const session = await web("pagination"); const userId = session.body.data.user.id;
    await db.chat.createMany({ data: Array.from({ length: 55 }, (_, index) => ({ userId, title: `Chat ${index}`, createdAt: new Date(0) })) });
    const first = await call("chat?limit=50", "GET", undefined, { cookie: session.access });
    expect(first.headers.get("x-has-more")).toBe("true");
    const firstItems = (await first.json()).data;
    const cursor = first.headers.get("x-next-cursor");
    const next = await call(`chat?limit=50&cursor=${cursor}`, "GET", undefined, { cookie: session.access });
    expect(next.headers.get("x-has-more")).toBe("false");
    const nextItems = (await next.json()).data;
    expect(firstItems).toHaveLength(50); expect(nextItems).toHaveLength(5);
    expect(new Set([...firstItems, ...nextItems].map((item: { id: string }) => item.id)).size).toBe(55);
  });
  it("maps malformed JSON, invalid file IDs and foreign chat writes to client errors", async () => {
    const first = await web("owner"); const other = await web("foreign");
    const chat = await db.chat.create({ data: { userId: first.body.data.user.id, title: "Private title" } });
    expect((await call("user", "PUT", "{", { cookie: first.access })).status).toBe(400);
    expect((await call("file", "DELETE", { id: {} }, { cookie: first.access })).status).toBe(400);
    expect((await call("chat", "PUT", { id: chat.id, title: "stolen" }, { cookie: other.access })).status).toBe(404);
    expect((await call("chat", "DELETE", { id: chat.id }, { cookie: other.access })).status).toBe(404);
    expect((await db.chat.findUniqueOrThrow({ where: { id: chat.id } })).title).toBe("Private title");
  });
  it("rejects inconsistent historical message/file ownership and keeps file cursors stable", async () => {
    const owner = await web("inconsistent-owner"); const other = await web("inconsistent-other");
    const userId = owner.body.data.user.id; const otherId = other.body.data.user.id;
    const chat = await db.chat.create({ data: { userId, title: "Owned chat" } });
    const foreignChat = await db.chat.create({ data: { userId: otherId, title: "Foreign chat" } });
    const inconsistent = await db.message.create({ data: { userId: otherId, chatId: chat.id, sender: "Foreign", content: "Must be excluded", timestamp: new Date() } });
    const file = await db.file.create({ data: { userId, chatId: foreignChat.id, url: "https://storage.invalid/exclude", size: 1 } });
    try {
      expect((await call(`message?id=${inconsistent.id}`, "GET", undefined, { cookie: owner.access })).status).toBe(404);
      expect((await (await call(`message?chatId=${chat.id}`, "GET", undefined, { cookie: owner.access })).json()).data).toEqual([]);
      expect((await call(`file?id=${file.id}`, "GET", undefined, { cookie: owner.access })).status).toBe(404);
      expect((await (await call("file", "GET", undefined, { cookie: owner.access })).json()).data).toEqual([]);
    } finally { await db.message.delete({ where: { id: inconsistent.id } }); await db.file.delete({ where: { id: file.id } }); }
    await db.file.createMany({ data: Array.from({ length: 3 }, (_, index) => ({ userId, url: `https://storage.invalid/${index}`, size: 1, createdAt: new Date(0) })) });
    const first = await call("file?limit=2", "GET", undefined, { cookie: owner.access });
    const firstItems = (await first.json()).data;
    const next = await call(`file?limit=2&cursor=${first.headers.get("x-next-cursor")}`, "GET", undefined, { cookie: owner.access });
    const nextItems = (await next.json()).data;
    expect(firstItems).toHaveLength(2); expect(nextItems).toHaveLength(1);
    expect(new Set([...firstItems, ...nextItems].map((item: { id: string }) => item.id)).size).toBe(3);
  });
  it("scrubs previously deleted rows and blocks a content writer authenticated before account deletion", async () => {
    const session = await web("erasure"); const userId = session.body.data.user.id;
    const chat = await db.chat.create({ data: { userId, title: "Sensitive title", participants: ["Private Person"] } });
    const message = await db.message.create({ data: { userId, chatId: chat.id, sender: "Private Person", content: "Private text", timestamp: new Date(), deletedAt: new Date() } });
    const file = await db.file.create({ data: { userId, chatId: chat.id, url: "https://storage.invalid/Private-Person", size: 123, deletedAt: new Date() } });
    let ready!: () => void; let release!: () => void;
    const waiting = new Promise<void>(resolve => { ready = resolve; }); const gate = new Promise<void>(resolve => { release = resolve; });
    const original = protectedDb.userSession.findFirst.bind(protectedDb.userSession);
    vi.spyOn(protectedDb.userSession, "findFirst").mockImplementationOnce((async (args: any) => { const row = await original(args); ready(); await gate; return row; }) as any);
    const pending = call("message", "POST", { chatId: chat.id, sender: "Late writer", content: "Must never persist" }, { cookie: session.access });
    await waiting;
    try {
      const deleted = await call("user", "DELETE", undefined, { cookie: session.access });
      expect(deleted.status).toBe(200);
      expect(deleted.headers.getSetCookie()).toHaveLength(4);
      expect(deleted.headers.getSetCookie().every((cookie: string) => cookie.includes("Max-Age=0"))).toBe(true);
    } finally { release(); }
    expect((await pending).status).toBe(401);
    expect(await db.message.count({ where: { userId } })).toBe(1);
    expect(await db.message.findUnique({ where: { id: message.id } })).toMatchObject({ sender: "", content: "", metadata: {}, timestamp: new Date(0) });
    expect(await db.chat.findUnique({ where: { id: chat.id } })).toMatchObject({ title: null, participants: [] });
    expect(await db.file.findUnique({ where: { id: file.id } })).toMatchObject({ url: "", size: 0 });
  });
});
