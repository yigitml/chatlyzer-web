import { afterEach, expect, it, vi } from "vitest";
import { createApiClient } from "../api";

afterEach(() => vi.unstubAllGlobals());
it("keeps API requests on the current deployment and encodes pagination queries", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ success: true, data: [] }));
  vi.stubGlobal("fetch", fetch);
  await createApiClient(() => null).get("/chat", { cursor: "a+b &c", limit: 20 });
  expect(fetch).toHaveBeenCalledWith("/api/chat?cursor=a%2Bb+%26c&limit=20", expect.objectContaining({ credentials: "include" }));
});
