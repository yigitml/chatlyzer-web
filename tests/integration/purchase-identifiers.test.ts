import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";

// Only the authenticated RevenueCat HTTP response is simulated. Account locks,
// ledger balances, purchase uniqueness and event ordering use real PostgreSQL.
let prisma: any, pool: Pool, commerce: any, owner: string, other: string, canonical: string, store: string;
const users: string[] = [], events: string[] = [];

function receipt(userId = owner, extra = {}) {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ subscriber: { non_subscriptions: { credits_24: [{ id: `provider-${canonical}`, transaction_id: canonical, store_transaction_id: store, is_sandbox: true, ...extra }] } } })));
  return commerce.syncRevenueCatCreditsForUser(userId);
}
function webhook(type: string, transaction: string, timestamp: number, extra = {}) {
  const id = `identifier-event-${crypto.randomUUID()}`;
  events.push(id, `refund:sandbox:${canonical}`, `refund:sandbox:${store}`);
  return commerce.processRevenueCatWebhook({ event: { id, type, transaction_id: transaction, environment: "SANDBOX", product_id: "credits_24", app_user_id: owner, event_timestamp_ms: timestamp, ...extra } });
}
async function balance(userId = owner) {
  return (await prisma.userCredit.findUnique({ where: { userId_type: { userId, type: "ANALYSIS" } } })).sandboxAmount;
}

beforeAll(async () => {
  const db = new URL(process.env.DATABASE_URL || "http://missing");
  if (!db.pathname.endsWith("_test") || !["127.0.0.1", "localhost"].includes(db.hostname)) throw new Error("Tests require disposable localhost _test database");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  prisma = (await import("../../src/backend/lib/prisma")).default;
  commerce = await import("../../src/backend/lib/revenueCat");
});
beforeEach(async () => {
  vi.stubEnv("REVENUECAT_FULFILLMENT_MODE", "sandbox");
  const accounts = await Promise.all([0, 1].map(() => prisma.user.create({ data: { name: "Identifier fixture", email: `identifier-${crypto.randomUUID()}@example.invalid` } })));
  [owner, other] = accounts.map(account => account.id); users.push(owner, other);
  for (const userId of [owner, other]) await prisma.userCredit.create({ data: { userId, type: "ANALYSIS", amount: 0, totalAmount: 0 } });
  canonical = `canonical-${crypto.randomUUID()}`; store = `store-${crypto.randomUUID()}`;
});
afterAll(async () => {
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
  for (const userId of users) {
    await pool.query('DELETE FROM "RevenueCatPurchase" WHERE "userId" = $1', [userId]);
    await pool.query('DELETE FROM "UserCredit" WHERE "userId" = $1', [userId]);
    await pool.query('DELETE FROM "User" WHERE "id" = $1', [userId]);
  }
  for (const id of new Set(events)) await pool.query('DELETE FROM "RevenueCatEvent" WHERE "id" = $1', [id]);
  await prisma?.$disconnect(); await pool?.end();
});

describe.sequential("Authenticated purchase identifier aliases", () => {
  it("maps a historical store-ID grant without granting again and preserves both webhook aliases", async () => {
    const purchase = await prisma.revenueCatPurchase.create({ data: { userId: owner, revenueCatTransactionId: `historical-${canonical}`, storeTransactionId: store, environment: "sandbox", creditsGranted: 24, productId: "credits_24" } });
    await prisma.userCredit.updateMany({ where: { userId: owner }, data: { sandboxAmount: 24 } });
    expect((await receipt()).creditsGranted).toBe(0);
    expect(await balance()).toBe(24);
    expect(await prisma.revenueCatPurchase.findUnique({ where: { id: purchase.id } })).toMatchObject({ revenueCatTransactionId: `sandbox:${canonical}`, storeTransactionId: store });
    expect((await webhook("NON_RENEWING_PURCHASE", canonical, 100)).creditsGranted).toBe(0);
    expect((await webhook("NON_RENEWING_PURCHASE", store, 101)).creditsGranted).toBe(0);
    expect(await prisma.revenueCatPurchase.count({ where: { userId: owner } })).toBe(1);
    expect(await balance()).toBe(24);
  });

  it("concurrent dual-ID receipts and single-alias webhooks grant once", async () => {
    await Promise.all([receipt(), receipt(), webhook("NON_RENEWING_PURCHASE", store, 100)]);
    await receipt();
    expect(await balance()).toBe(24);
    expect(await prisma.revenueCatPurchase.count({ where: { userId: owner } })).toBe(1);
    const purchase = await prisma.revenueCatPurchase.findFirst({ where: { userId: owner } });
    expect(purchase).toMatchObject({ revenueCatTransactionId: `sandbox:${canonical}`, storeTransactionId: store });
    await webhook("NON_RENEWING_PURCHASE", store, 101);
    expect((await prisma.revenueCatPurchase.findUnique({ where: { id: purchase.id } })).revenueCatTransactionId).toBe(`sandbox:${canonical}`);
  });

  it("a store-only receipt replays an already mapped dual-ID grant without dropping its canonical alias", async () => {
    await receipt();
    expect((await receipt(owner, { transaction_id: undefined })).creditsGranted).toBe(0);
    expect(await balance()).toBe(24);
    expect(await prisma.revenueCatPurchase.findFirst({ where: { userId: owner } })).toMatchObject({ revenueCatTransactionId: `sandbox:${canonical}`, storeTransactionId: store });
  });

  it("another account cannot replay aliases or acquire ownership, including after refund", async () => {
    await receipt();
    expect((await receipt(other)).creditsGranted).toBe(0);
    expect(await balance(other)).toBe(0);
    await webhook("CANCELLATION", store, 200, { cancel_reason: "CUSTOMER_SUPPORT" });
    expect(await balance()).toBe(0);
    expect((await receipt(other)).creditsGranted).toBe(0);
    expect((await receipt()).creditsGranted).toBe(0);
    expect(await balance()).toBe(0); expect(await balance(other)).toBe(0);
    expect((await prisma.revenueCatPurchase.findFirst({ where: { storeTransactionId: store } })).userId).toBe(owner);
  });

  for (const deleted of [false, true]) it(`foreign receipt maps historical aliases while preserving ${deleted ? "deleted" : "active"} ownership`, async () => {
    const purchase = await prisma.revenueCatPurchase.create({ data: { userId: owner, revenueCatTransactionId: `historical-${canonical}`, storeTransactionId: store, environment: "sandbox", creditsGranted: 24, productId: "credits_24", ...(deleted ? { deletedAt: new Date(0) } : {}) } });
    if (deleted) await prisma.user.update({ where: { id: owner }, data: { isActive: false, deletedAt: new Date(0) } });
    else await prisma.userCredit.updateMany({ where: { userId: owner }, data: { sandboxAmount: 24 } });
    expect((await receipt(other)).creditsGranted).toBe(0);
    expect((await webhook("NON_RENEWING_PURCHASE", canonical, 100, { app_user_id: other })).creditsGranted).toBe(0);
    const persisted = await prisma.revenueCatPurchase.findUnique({ where: { id: purchase.id } });
    expect(persisted).toMatchObject({ userId: owner, revenueCatTransactionId: `sandbox:${canonical}`, storeTransactionId: store });
    expect(Boolean(persisted.deletedAt)).toBe(deleted);
    expect(await balance(other)).toBe(0); expect(await balance()).toBe(deleted ? 0 : 24);
    expect(await prisma.revenueCatPurchase.count({ where: { userId: other } })).toBe(0);
  });

  it("alternate-alias concurrent refunds, reversal and delayed refund preserve exactly-once ordering", async () => {
    await receipt();
    await Promise.all([webhook("CANCELLATION", canonical, 200, { cancel_reason: "CUSTOMER_SUPPORT" }), webhook("CANCELLATION", store, 201, { cancel_reason: "CUSTOMER_SUPPORT" })]);
    expect(await balance()).toBe(0);
    await webhook("REFUND_REVERSED", canonical, 300);
    expect(await balance()).toBe(24);
    await webhook("CANCELLATION", store, 250, { cancel_reason: "CUSTOMER_SUPPORT" });
    expect(await balance()).toBe(24);
    expect((await receipt()).creditsGranted).toBe(0);
  });

  it("a refund tombstone for either authenticated alias blocks a later grant", async () => {
    await webhook("CANCELLATION", store, 200, { cancel_reason: "CUSTOMER_SUPPORT" });
    expect((await receipt()).creditsGranted).toBe(0);
    expect(await balance()).toBe(0);
    expect(await prisma.revenueCatPurchase.count({ where: { userId: owner } })).toBe(0);
  });

  it("contradictory receipt aliases require reconciliation and never discard a known identifier", async () => {
    const purchase = await prisma.revenueCatPurchase.create({ data: { userId: owner, revenueCatTransactionId: `sandbox:${store}`, storeTransactionId: canonical, environment: "sandbox", creditsGranted: 24, productId: "credits_24" } });
    await prisma.userCredit.updateMany({ where: { userId: owner }, data: { sandboxAmount: 24 } });
    await expect(receipt(owner, { store_transaction_id: `different-${store}` })).rejects.toMatchObject({ status: 409 });
    expect(await prisma.revenueCatPurchase.findUnique({ where: { id: purchase.id } })).toMatchObject({ revenueCatTransactionId: `sandbox:${store}`, storeTransactionId: canonical });
    await webhook("CANCELLATION", store, 200, { cancel_reason: "CUSTOMER_SUPPORT" });
    expect(await balance()).toBe(0);
  });

  it("the newest authenticated alias state wins before a receipt creates the grant", async () => {
    await webhook("CANCELLATION", canonical, 100, { cancel_reason: "CUSTOMER_SUPPORT" });
    await webhook("REFUND_REVERSED", store, 300);
    expect((await receipt()).creditsGranted).toBe(24);
    expect(await balance()).toBe(24);
    await webhook("CANCELLATION", canonical, 200, { cancel_reason: "CUSTOMER_SUPPORT" });
    expect(await balance()).toBe(24);
    for (const id of [canonical, store]) expect((await prisma.revenueCatEvent.findUnique({ where: { id: `refund:sandbox:${id}` } })).eventTimestamp).toBe(BigInt(300));
  });

  it("linking a refunded alternate alias revokes an existing grant once and reversal restores once", async () => {
    await receipt(owner, { store_transaction_id: undefined });
    await webhook("CANCELLATION", store, 200, { cancel_reason: "CUSTOMER_SUPPORT" });
    expect(await balance()).toBe(24);
    expect((await receipt()).creditsGranted).toBe(0);
    expect(await balance()).toBe(0);
    await receipt(); expect(await balance()).toBe(0);
    await webhook("REFUND_REVERSED", canonical, 300);
    await receipt(); expect(await balance()).toBe(24);
  });

  it("a refund retries when aliases change while its advisory lock is waiting", async () => {
    const purchase = await prisma.revenueCatPurchase.create({ data: { userId: owner, revenueCatTransactionId: `historical-${canonical}`, storeTransactionId: store, environment: "sandbox", creditsGranted: 24, productId: "credits_24" } });
    await prisma.userCredit.updateMany({ where: { userId: owner }, data: { sandboxAmount: 24 } });
    const blocker = await pool.connect();
    let outcome: Promise<any> | undefined;
    try {
      await blocker.query("BEGIN");
      await blocker.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`sandbox:${store}`]);
      const pid = (await blocker.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      outcome = webhook("CANCELLATION", store, 200, { cancel_reason: "CUSTOMER_SUPPORT" }).then((result: any) => ({ result }), (error: any) => ({ error }));
      let waiting = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        waiting = Number((await pool.query("SELECT count(*) AS n FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))", [pid])).rows[0].n) > 0;
        if (waiting) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      // Simulate a committed authenticated alias mapping and newer signed state
      // while the old-alias refund waits, using real database locks throughout.
      await blocker.query('UPDATE "RevenueCatPurchase" SET "revenueCatTransactionId" = $1 WHERE "id" = $2', [`sandbox:${canonical}`, purchase.id]);
      events.push(`refund:sandbox:${canonical}`);
      await blocker.query('INSERT INTO "RevenueCatEvent" (id, type, disposition, "eventTimestamp", "createdAt") VALUES ($1, $2, $3, $4, now())', [`refund:sandbox:${canonical}`, "PURCHASE_STATE", "refund_reversed", 300]);
      await blocker.query("COMMIT");
      expect((await outcome).error).toMatchObject({ status: 409 });
      expect(await balance()).toBe(24);
      await webhook("CANCELLATION", store, 200, { cancel_reason: "CUSTOMER_SUPPORT" });
      expect(await balance()).toBe(24);
    } finally {
      await blocker.query("ROLLBACK"); blocker.release();
      if (outcome) await outcome;
    }
  });
});
