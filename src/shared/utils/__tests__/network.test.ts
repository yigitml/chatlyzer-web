import { afterEach, expect, it, vi } from "vitest";
import { createNetworkService } from "../network";
afterEach(() => vi.unstubAllGlobals());
it("follows cursors so records beyond 50 are accessible", async () => {
  const first = Array.from({ length: 50 }, (_, i) => ({ id: `chat-${i}` }));
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: first }, { headers: { "X-Page-Limit": "50", "X-Has-More": "true", "X-Next-Cursor": "chat-49" } }))
    .mockResolvedValueOnce(Response.json({ data: [{ id: "chat-50" }] }, { headers: { "X-Page-Limit": "50", "X-Has-More": "false" } }));
  vi.stubGlobal("fetch", fetch);
  const records = await createNetworkService(() => null).fetchChats();
  expect(records).toHaveLength(51);
  expect(fetch.mock.calls[1][0]).toBe("/api/chat?cursor=chat-49");
});
it("serializes complete login handshakes so a late A cookie cannot overwrite B", async () => {
  const events = new EventTarget();
  vi.stubGlobal("window", events);
  let release!: () => void;
  let started!: () => void;
  const firstStarted = new Promise<void>(resolve => { started = resolve; });
  const firstWait = new Promise<void>(resolve => { release = resolve; });
  let cookieIdentity = "none";
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    if (init.method === "GET") return Response.json({ data: { csrfToken: "fixture-csrf" } });
    const identity = JSON.parse(String(init.body)).idToken;
    if (identity === "A") { started(); await firstWait; }
    cookieIdentity = identity;
    return Response.json({ data: { user: { id: identity } } });
  });
  vi.stubGlobal("fetch", fetch);
  const service = createNetworkService(() => null);
  const first = service.login({ idToken: "A", sessionId: "session-A" }).catch(error => error);
  await firstStarted;
  events.dispatchEvent(new Event("chatlyzer:session-changed"));
  const second = service.login({ idToken: "B", sessionId: "session-B" });
  await Promise.resolve();
  expect(fetch).toHaveBeenCalledTimes(2);
  release();
  await first;
  expect((await second).user.id).toBe("B");
  expect(cookieIdentity).toBe("B");
  expect(fetch.mock.calls.filter(([, init]) => init.method === "POST").map(([, init]) => JSON.parse(String(init.body)).idToken)).toEqual(["A", "B"]);
});
