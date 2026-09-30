import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sign } from "jsonwebtoken";
import { NextRequest } from "next/server";
import { rawPrisma as db } from "@/backend/lib/prisma";
import { GET as chatsGET } from "@/app/api/chat/route";
import { GET as messagesGET } from "@/app/api/message/route";
import { GET as analysesGET } from "@/app/api/analysis/route";
import { GET as filesGET } from "@/app/api/file/route";
import { createNetworkService } from "@/shared/utils/network";
const url = new URL(process.env.DATABASE_URL || "");
if (!url.pathname.endsWith("_test") || !["127.0.0.1", "localhost"].includes(url.hostname)) throw new Error("Disposable local _test database required");
const userId = `pages-${randomUUID()}`;
const chatId = `pages-chat-${randomUUID()}`;
let cookie = "";
beforeAll(async () => {
  await db.rateLimit.deleteMany();
  const loginGeneration = randomUUID();
  await db.user.create({ data: { id: userId, name: "Pagination fixture", email: `${userId}@example.test`, sessions: { create: { sessionId: "fixture", loginGeneration, lastActivityAt: new Date() } } } });
  cookie = `accessToken=${sign({ userId, tokenVersion: 0, isMobile: false, sessionId: "fixture", loginGeneration }, process.env.JWT_SECRET!, { algorithm: "HS256", expiresIn: "1h" })}`;
  const times = Array.from({ length: 61 }, (_, i) => new Date(Date.UTC(2026, 0, 1, 0, i)));
  await db.chat.createMany({ data: times.map((createdAt, i) => ({ id: i === 0 ? chatId : `${chatId}-${i}`, title: `Fixture ${i}`, userId, createdAt })) });
  await db.message.createMany({ data: times.map((timestamp, i) => ({ id: `${userId}-m${i}`, chatId, userId, sender: "Synthetic", content: `Message ${i}`, timestamp, createdAt: timestamp })) });
  await db.analysis.createMany({ data: times.map((createdAt, i) => ({ id: `${userId}-a${i}`, chatId, userId, createdAt: times[0], status: "COMPLETED", result: { type: "vibe_check" } })) });
  await db.file.createMany({ data: times.map((createdAt, i) => ({ id: `${userId}-f${i}`, userId, createdAt, url: "https://example.test/synthetic", size: 0 })) });
});
afterAll(async () => {
  await db.file.deleteMany({ where: { userId } }); await db.analysis.deleteMany({ where: { userId } });
  await db.message.deleteMany({ where: { userId } }); await db.chat.deleteMany({ where: { userId } });
  await db.userSession.deleteMany({ where: { userId } }); await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});
it("keeps 61 records accessible through real authenticated handlers and the network client", async () => {
  const original = globalThis.fetch;
  const routes: Record<string, typeof chatsGET> = { "/api/chat": chatsGET, "/api/message": messagesGET, "/api/analysis": analysesGET, "/api/file": filesGET };
  globalThis.fetch = async input => {
    const requestUrl = new URL(String(input), "http://localhost:3015");
    return routes[requestUrl.pathname](new NextRequest(requestUrl, { headers: { cookie } }));
  };
  try {
    const client = createNetworkService(() => null);
    const chatAnalyses = await client.fetchAnalyzes({ chatId });
    const allAnalyses = await client.fetchAnalyzes();
    const expectedAnalysisIds = Array.from({ length: 61 }, (_, i) => `${userId}-a${i}`).sort().reverse();
    expect(chatAnalyses.map(record => record.id)).toEqual(expectedAnalysisIds);
    expect(allAnalyses.map(record => record.id)).toEqual(expectedAnalysisIds);
    for (const records of [await client.fetchChats(), await client.fetchMessages({ chatId }), chatAnalyses, allAnalyses, await client.fetchFiles()]) {
      expect(records).toHaveLength(61);
      expect(new Set(records.map(record => record.id)).size).toBe(61);
    }
    const page = await client.fetchChatsPage({ limit: 20 });
    expect(page.items).toHaveLength(20); expect(page.pageInfo).toMatchObject({ limit: 20, hasMore: true });
    expect(page.pageInfo.nextCursor).toBe(page.items[19].id);
  } finally { globalThis.fetch = original; }
});
