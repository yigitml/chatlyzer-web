import { z } from "zod";
import prisma, { rawPrisma } from "@/backend/lib/prisma";
import { grantUserCredits, creditEnvironment } from "@/backend/lib/consumeUserCredits";
import { CreditType, Prisma } from "../../generated/client/client";
import { getRequiredServerEnv } from "@/shared/config/env";
import { lockActiveAccount } from "./accountLock";
import { ApiError } from "./apiBoundary";

const PRODUCT = () => process.env.REVENUECAT_CREDITS_PRODUCT_ID || "credits_24";
const CREDIT_COUNT = () => {
  const value = Number(process.env.REVENUECAT_CREDITS_PER_PURCHASE || 24);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("Invalid purchase credit amount");
  return value;
};
type Purchase = { id?: string; transaction_id?: string; store_transaction_id?: string; product_id?: string; product_identifier?: string; store?: string; purchase_date?: string; purchase_date_ms?: number; is_sandbox?: boolean };
export type RevenueCatWebhookEvent = { id?: string; type?: string; app_user_id?: string; original_app_user_id?: string; aliases?: string[]; transferred_from?: string[]; transferred_to?: string[]; transaction_id?: string; original_transaction_id?: string; product_id?: string; environment?: string; cancel_reason?: string; event_timestamp_ms?: number; purchased_at_ms?: number; store?: string };
export type RevenueCatWebhookPayload = { event?: RevenueCatWebhookEvent };
export type RevenueCatSyncResult = { creditsGranted: number; processedTransactions: number; pendingVerification: number };

function stablePurchaseIds(purchase: Purchase) {
  return [...new Set([purchase.transaction_id, purchase.store_transaction_id].filter((id): id is string => !!id))];
}

function purchaseLookup(environment: string, ids: string[], revenueCatId?: string) {
  return { OR: [
    { revenueCatTransactionId: { in: ids.map(id => `${environment}:${id}`) } },
    { revenueCatTransactionId: { in: ids } },
    { storeTransactionId: { in: ids }, environment },
    ...(revenueCatId ? [{ revenueCatTransactionId: revenueCatId }] : []),
  ] };
}

async function lockPurchaseIds(tx: Prisma.TransactionClient, environment: string, ids: string[]) {
  // A receipt can authenticate two different identifiers for the same purchase.
  // Lock every alias in a stable order so syncs and signed webhooks serialize.
  for (const key of [...new Set(ids.map(id => `${environment}:${id}`))].sort()) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  }
}

function newestPurchaseState<T extends { eventTimestamp: bigint; disposition: string }>(states: T[]): T | undefined {
  return states.reduce<T | undefined>((latest, state) => !latest || state.eventTimestamp > latest.eventTimestamp || (state.eventTimestamp === latest.eventTimestamp && state.disposition === "refund_reversed") ? state : latest, undefined);
}

async function writePurchaseState(tx: Prisma.TransactionClient, environment: string, ids: string[], state: { disposition: string; eventTimestamp: bigint }) {
  const data = { disposition: state.disposition, eventTimestamp: state.eventTimestamp };
  for (const key of ids.map(id => `refund:${environment}:${id}`)) await tx.revenueCatEvent.upsert({ where: { id: key }, update: data, create: { id: key, type: "PURCHASE_STATE", ...data } });
}

const identity = z.string().min(1).max(200);
const webhookSchema = z.object({ event: z.object({
  id: identity, type: z.string().min(1).max(64),
  app_user_id: identity.optional(), original_app_user_id: identity.optional(),
  aliases: z.array(identity).max(100).optional(), transferred_from: z.array(identity).max(100).optional(), transferred_to: z.array(identity).max(100).optional(),
  transaction_id: identity.optional(), original_transaction_id: identity.optional(), product_id: identity.optional(),
  environment: z.enum(["SANDBOX", "PRODUCTION"]).optional(), cancel_reason: z.string().max(100).optional(),
  event_timestamp_ms: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(), purchased_at_ms: z.number().int().nonnegative().max(8_640_000_000_000_000).optional(), store: z.string().max(100).optional(),
}).passthrough() }).passthrough();

export function getRevenueCatWebhookUserIds(payload: RevenueCatWebhookPayload): string[] {
  const event = payload.event;
  const ids = event?.type === "TRANSFER" ? [...(event.transferred_from || []), ...(event.transferred_to || [])] : [event?.app_user_id, event?.original_app_user_id, ...(event?.aliases || [])];
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && !!id))];
}

export async function syncRevenueCatCreditsForUser(userId: string): Promise<RevenueCatSyncResult> {
  const account = await prisma.user.findFirst({ where: { id: userId, deletedAt: null, isActive: true } });
  if (!account) throw new ApiError("Active purchase account not found", 404);
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${getRequiredServerEnv("REVENUECAT_SECRET_API_KEY")}`, Accept: "application/json" }, signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`RevenueCat request failed (${response.status})`);
  const subscriber = await response.json() as { subscriber?: { non_subscriptions?: Record<string, Purchase[]> } };
  const purchases = subscriber.subscriber?.non_subscriptions?.[PRODUCT()] || [];
  const result = { creditsGranted: 0, processedTransactions: 0, pendingVerification: 0 };
  for (const purchase of purchases) {
    // v1 `id` is a RevenueCat identity, not guaranteed to equal webhook store transaction_id.
    if ((!purchase.transaction_id && !purchase.store_transaction_id) || typeof purchase.is_sandbox !== "boolean") { result.pendingVerification++; continue; }
    const granted = await grantVerifiedPurchase(userId, account.tokenVersion, purchase);
    if (granted) { result.creditsGranted += CREDIT_COUNT(); result.processedTransactions++; }
  }
  return result;
}

async function grantVerifiedPurchase(userId: string, accountVersion: number, purchase: Purchase) {
  const transactionId = purchase.transaction_id || purchase.store_transaction_id;
  if (!transactionId || typeof purchase.is_sandbox !== "boolean") return false;
  const environment = purchase.is_sandbox ? "sandbox" : "production";
  if (environment !== creditEnvironment()) return false;
  const ids = stablePurchaseIds(purchase);
  const key = `${environment}:${transactionId}`;
  const credits = CREDIT_COUNT();
  // Deleted grants remain financial tombstones and must participate in dedupe.
  return rawPrisma.$transaction(async tx => {
    await lockPurchaseIds(tx, environment, ids);
    const matches = await tx.revenueCatPurchase.findMany({ where: purchaseLookup(environment, ids, purchase.id) });
    if (matches.length > 1) throw new ApiError("Purchase identifiers require reconciliation", 409);
    const existing = matches[0];
    for (const accountId of [...new Set([userId, existing?.userId].filter((id): id is string => !!id))].sort()) {
      if (accountId === userId) await lockActiveAccount(tx, userId, accountVersion);
      else await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${accountId} FOR UPDATE`;
    }
    const reversal = newestPurchaseState(await tx.revenueCatEvent.findMany({ where: { id: { in: ids.map(id => `refund:${environment}:${id}`) } } }));
    if (existing) {
      // Preserve immutable ownership, including deleted and reversed grants.
      // Authenticated receipts can fill historical alias mappings without credit.
      if (existing.environment === environment) {
        const mappedIds = [existing.storeTransactionId, existing.revenueCatTransactionId.startsWith(`${environment}:`) ? existing.revenueCatTransactionId.slice(environment.length + 1) : undefined].filter((id): id is string => !!id);
        const conflictingIds = purchase.transaction_id
          ? mappedIds.some(id => !ids.includes(id))
          : existing.storeTransactionId && existing.storeTransactionId !== purchase.store_transaction_id;
        if (purchase.store_transaction_id && conflictingIds) throw new ApiError("Purchase identifiers require reconciliation", 409);
        const canonicalId = purchase.transaction_id && purchase.store_transaction_id ? key : existing.revenueCatTransactionId.startsWith(`${environment}:`) ? existing.revenueCatTransactionId : key;
        await tx.revenueCatPurchase.update({ where: { id: existing.id }, data: { revenueCatTransactionId: canonicalId, storeTransactionId: purchase.store_transaction_id || existing.storeTransactionId || transactionId } });
        if (purchase.transaction_id && purchase.store_transaction_id && reversal) {
          const owner = await tx.user.findUnique({ where: { id: existing.userId } });
          if (owner?.isActive && !owner.deletedAt && !existing.deletedAt) {
            const shouldReverse = reversal.disposition === "refunded";
            if (shouldReverse !== Boolean(existing.reversedAt)) {
              const delta = shouldReverse ? -existing.creditsGranted : existing.creditsGranted;
              await tx.userCredit.update({ where: { userId_type: { userId: existing.userId, type: CreditType.ANALYSIS } }, data: environment === "sandbox" ? { sandboxAmount: { increment: delta } } : { amount: { increment: delta } } });
              await tx.revenueCatPurchase.update({ where: { id: existing.id }, data: { reversedAt: shouldReverse ? new Date() : null } });
            }
          }
          await writePurchaseState(tx, environment, ids, reversal);
        }
      }
      return false;
    }
    if (reversal) await writePurchaseState(tx, environment, ids, reversal);
    if (reversal?.disposition === "refunded") return false;
    await tx.revenueCatPurchase.create({ data: { revenueCatTransactionId: key, storeTransactionId: purchase.store_transaction_id || transactionId, userId, productId: PRODUCT(), store: purchase.store, environment, purchasedAt: purchase.purchase_date_ms ? new Date(purchase.purchase_date_ms) : purchase.purchase_date ? new Date(purchase.purchase_date) : null, creditsGranted: credits } });
    await grantUserCredits(userId, CreditType.ANALYSIS, credits, tx, environment);
    return true;
  });
}

/** Full grant reversal may create debt: spent credits remain owed; future grants repay it. */
export async function processRevenueCatWebhook(payload: RevenueCatWebhookPayload) {
  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success) throw new ApiError("Invalid webhook event", 400);
  const event = parsed.data.event;
  if (await prisma.revenueCatEvent.findUnique({ where: { id: event.id } })) return { replay: true, creditsGranted: 0, processedTransactions: 0 };
  if (event.type === "TRANSFER") {
    const ids = getRevenueCatWebhookUserIds(payload);
    if (!ids.length) throw new ApiError("Transfer identities are required", 400);
    const accounts = await prisma.user.findMany({ where: { id: { in: ids }, isActive: true, deletedAt: null } });
    if (accounts.length !== ids.length) throw new ApiError("Every transfer identity must resolve to an active account", 409);
    // Immutable consumable ownership: transfers affect provider entitlements, never move spent grants.
    await prisma.revenueCatEvent.upsert({ where: { id: event.id }, update: {}, create: { id: event.id, type: event.type, disposition: "consumable_owner_unchanged" } });
    return { policy: "consumable_owner_unchanged", creditsGranted: 0, processedTransactions: 0 };
  }
  const refund = event.type === "CANCELLATION" && event.cancel_reason === "CUSTOMER_SUPPORT";
  const reverseRefund = event.type === "REFUND_REVERSED";
  if (refund || reverseRefund) {
    if (event.product_id !== PRODUCT()) {
      await prisma.revenueCatEvent.upsert({ where: { id: event.id }, update: {}, create: { id: event.id, type: event.type, disposition: "unrelated_product" } });
      return { creditsGranted: 0, processedTransactions: 0 };
    }
    const transactionId = event.transaction_id;
    const environment = event.environment?.toLowerCase();
    if (!transactionId || (environment !== "sandbox" && environment !== "production")) throw new ApiError("Refund transaction and environment required", 400);
    if (!Number.isSafeInteger(event.event_timestamp_ms) || event.event_timestamp_ms! <= 0) throw new ApiError("Refund event timestamp required", 400);
    const eventTimestamp = BigInt(event.event_timestamp_ms!);
    await prisma.$transaction(async tx => {
      // Discover persisted aliases before locking, then re-read under all locks.
      const knownPurchase = await tx.revenueCatPurchase.findFirst({ where: purchaseLookup(environment, [transactionId]) });
      const ids = [...new Set([transactionId, knownPurchase?.storeTransactionId,
        knownPurchase?.revenueCatTransactionId.startsWith(`${environment}:`) ? knownPurchase.revenueCatTransactionId.slice(environment.length + 1) : undefined,
      ].filter((id): id is string => !!id))];
      await lockPurchaseIds(tx, environment, ids);
      if (await tx.revenueCatEvent.findUnique({ where: { id: event.id! } })) return;
      const purchase = await tx.revenueCatPurchase.findFirst({ where: purchaseLookup(environment, ids) });
      const currentIds = [purchase?.storeTransactionId, purchase?.revenueCatTransactionId.startsWith(`${environment}:`) ? purchase.revenueCatTransactionId.slice(environment.length + 1) : undefined].filter((id): id is string => !!id);
      if (currentIds.some(id => !ids.includes(id))) throw new ApiError("Purchase aliases changed; retry the event", 409);
      const stateKeys = ids.map(id => `refund:${environment}:${id}`);
      const states = await tx.revenueCatEvent.findMany({ where: { id: { in: stateKeys } } });
      const state = newestPurchaseState(states);
      if (state && (state.eventTimestamp > eventTimestamp || (state.eventTimestamp === eventTimestamp && state.disposition === "refund_reversed" && refund))) {
        await tx.revenueCatEvent.create({ data: { id: event.id!, type: event.type!, disposition: "stale_event_ignored", eventTimestamp } });
        return;
      }
      if (purchase && purchase.environment !== environment) throw new ApiError("Purchase environment requires reconciliation", 409);
      if (purchase && !purchase.deletedAt) {
        const account = await tx.user.findUnique({ where: { id: purchase.userId } });
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${purchase.userId} FOR UPDATE`;
        const active = await tx.user.findUnique({ where: { id: purchase.userId } });
        if (active?.isActive && !active.deletedAt && account) {
          if (refund && !purchase.reversedAt) {
            // Negative balances are deliberate debt; conditional AI debits reject them.
            await tx.userCredit.update({ where: { userId_type: { userId: purchase.userId, type: CreditType.ANALYSIS } }, data: environment === "sandbox" ? { sandboxAmount: { decrement: purchase.creditsGranted } } : { amount: { decrement: purchase.creditsGranted } } });
            await tx.revenueCatPurchase.update({ where: { id: purchase.id }, data: { reversedAt: new Date() } });
          } else if (reverseRefund && purchase.reversedAt) {
            await tx.userCredit.update({ where: { userId_type: { userId: purchase.userId, type: CreditType.ANALYSIS } }, data: environment === "sandbox" ? { sandboxAmount: { increment: purchase.creditsGranted } } : { amount: { increment: purchase.creditsGranted } } });
            await tx.revenueCatPurchase.update({ where: { id: purchase.id }, data: { reversedAt: null } });
          }
        }
      }
      // Tombstone also handles refund arriving before a purchase sync.
      await writePurchaseState(tx, environment, ids, { disposition: refund ? "refunded" : "refund_reversed", eventTimestamp });
      await tx.revenueCatEvent.create({ data: { id: event.id!, type: event.type!, disposition: refund ? "refunded" : "refund_reversed", eventTimestamp } });
    });
    return { creditsGranted: 0, processedTransactions: 0 };
  }
  let creditsGranted = 0, processedTransactions = 0;
  if (["NON_RENEWING_PURCHASE", "PURCHASE_REDEEMED"].includes(event.type)) {
    const ids = getRevenueCatWebhookUserIds(payload);
    const users = await prisma.user.findMany({ where: { id: { in: ids }, isActive: true, deletedAt: null } });
    if (users.length !== 1) throw new ApiError("Purchase identity must resolve to one active account", 409);
    if (event.product_id !== PRODUCT()) throw new ApiError("Unsupported consumable product", 400);
    if (!event.transaction_id || !["SANDBOX", "PRODUCTION"].includes(event.environment || "")) throw new ApiError("Purchase transaction and environment required", 400);
    if (event.environment!.toLowerCase() !== creditEnvironment()) throw new ApiError("Purchase environment is disabled; retry after billing reconciliation", 503);
    const granted = await grantVerifiedPurchase(users[0].id, users[0].tokenVersion, { transaction_id: event.transaction_id, is_sandbox: event.environment === "SANDBOX", purchase_date_ms: event.purchased_at_ms, store: event.store });
    creditsGranted = granted ? CREDIT_COUNT() : 0; processedTransactions = granted ? 1 : 0;
  }
  await prisma.revenueCatEvent.upsert({ where: { id: event.id }, update: {}, create: { id: event.id, type: event.type, disposition: "handled" } });
  return { creditsGranted, processedTransactions };
}
