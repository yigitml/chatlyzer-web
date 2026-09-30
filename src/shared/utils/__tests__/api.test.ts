import { afterEach, expect, it, vi } from "vitest";
import { createApiClient } from "../api";

const browserEvents = new EventTarget();
afterEach(() => vi.unstubAllGlobals());
it("keeps API requests on the current deployment and encodes pagination queries", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ success: true, data: [] }));
  vi.stubGlobal("fetch", fetch);
  await createApiClient(() => null).get("/chat", { cursor: "a+b &c", limit: 20 });
  expect(fetch).toHaveBeenCalledWith("/api/chat?cursor=a%2Bb+%26c&limit=20", expect.objectContaining({ credentials: "include" }));
});
it("preserves server pagination headers alongside the data envelope", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: true, data: [{ id: "one" }] }, { headers: { "X-Page-Limit": "50", "X-Has-More": "true", "X-Next-Cursor": "one" } })));
  expect(await createApiClient(() => null).get("/chat")).toEqual({ success: true, data: [{ id: "one" }], pageInfo: { limit: 50, hasMore: true, nextCursor: "one" } });
});
it("coordinates concurrent cookie refresh and retries each protected request once", async () => {
  let refreshed = false;
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith("/refresh")) { await Promise.resolve(); refreshed = true; return Response.json({ success: true }); }
    return refreshed ? Response.json({ success: true, data: url }) : Response.json({ error: "Expired" }, { status: 401 });
  });
  vi.stubGlobal("fetch", fetch);
  const client = createApiClient(() => null);
  const result = await Promise.all([client.get("/user"), client.get("/chat")]);
  expect(result.every(r => r.success)).toBe(true);
  expect(fetch.mock.calls.filter(([url]) => url.endsWith("/refresh"))).toHaveLength(1);
});
it("does not loop on terminal rejection or retry provider errors", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));
  vi.stubGlobal("fetch", fetch);
  await expect(createApiClient(() => null).get("/user")).rejects.toMatchObject({ status: 401 });
  expect(fetch).toHaveBeenCalledTimes(2);
  fetch.mockClear().mockResolvedValue(Response.json({ error: "Provider unavailable" }, { status: 503 }));
  await expect(createApiClient(() => null).post("/analysis", { requestKey: "one" })).rejects.toMatchObject({ status: 503 });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("rejects delayed responses from an obsolete browser identity", async () => {
  const target = browserEvents;
  vi.stubGlobal("window", target);
  let resolve!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolve = r; })));
  const request = createApiClient(() => null).get("/user");
  target.dispatchEvent(new Event("chatlyzer:session-changed"));
  resolve(Response.json({ success: true, data: { id: "previous-user" } }));
  await expect(request).rejects.toMatchObject({ obsolete: true });
});
it("orders a new login after an in-flight refresh cookie response", async () => {
  vi.stubGlobal("window", browserEvents);
  let release!: () => void;
  let started!: () => void;
  const refreshStarted = new Promise<void>(resolve => { started = resolve; });
  const refreshWait = new Promise<void>(resolve => { release = resolve; });
  let cookieIdentity = "A";
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith("/refresh")) {
      started(); await refreshWait; cookieIdentity = "A";
      return Response.json({ success: true });
    }
    if (url === "/api/auth/web") { cookieIdentity = "B"; return Response.json({ success: true }); }
    return Response.json({ error: "Expired" }, { status: 401 });
  });
  vi.stubGlobal("fetch", fetch);
  const client = createApiClient(() => null);
  const obsolete = client.get("/user").catch(error => error);
  await refreshStarted;
  browserEvents.dispatchEvent(new Event("chatlyzer:session-changed"));
  const login = client.post("/auth/web", { idToken: "B", sessionId: "new-session" });
  await Promise.resolve();
  expect(fetch.mock.calls.some(([url]) => url === "/api/auth/web")).toBe(false);
  release(); await login;
  expect(cookieIdentity).toBe("B");
  expect(await obsolete).toMatchObject({ obsolete: true });
});
it("refreshes expired access before logout so its valid refresh generation is revoked", async () => {
  let refreshed = false;
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith("/refresh")) { refreshed = true; return Response.json({ success: true }); }
    return refreshed ? Response.json({ success: true }) : Response.json({ error: "Expired" }, { status: 401 });
  });
  vi.stubGlobal("fetch", fetch);
  expect(await createApiClient(() => null).post("/auth/web/logout")).toEqual({ success: true });
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(["/api/auth/web/logout", "/api/auth/web/refresh", "/api/auth/web/logout"]);
});
