import prisma from "@/backend/lib/prisma";
import { grantUserCredits } from "@/backend/lib/consumeUserCredits";
import { CreditType } from "../../generated/client/client";

const REVENUECAT_API_BASE_URL = "https://api.revenuecat.com/v1";
const DEFAULT_CREDITS_PRODUCT_ID = "credits_24";
const DEFAULT_CREDITS_PER_PURCHASE = 24;

type RevenueCatNonSubscriptionPurchase = {
  id?: string;
  transaction_id?: string;
  store_transaction_id?: string;
  product_id?: string;
  product_identifier?: string;
  store?: string;
  purchase_date?: string;
  purchase_date_ms?: number;
};

type RevenueCatSubscriberResponse = {
  subscriber?: {
    non_subscriptions?: Record<string, RevenueCatNonSubscriptionPurchase[]>;
  };
};

export type RevenueCatSyncResult = {
  creditsGranted: number;
  processedTransactions: number;
};

function getRevenueCatSecretKey(): string {
  const secretKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secretKey) {
    throw new Error("REVENUECAT_SECRET_API_KEY is not configured");
  }
  return secretKey;
}

function getCreditsProductId(): string {
  return process.env.REVENUECAT_CREDITS_PRODUCT_ID || DEFAULT_CREDITS_PRODUCT_ID;
}

function getCreditsPerPurchase(): number {
  const configuredValue = Number.parseInt(
    process.env.REVENUECAT_CREDITS_PER_PURCHASE || "",
    10,
  );

  return Number.isFinite(configuredValue) && configuredValue > 0
    ? configuredValue
    : DEFAULT_CREDITS_PER_PURCHASE;
}

function getPurchaseTransactionId(
  purchase: RevenueCatNonSubscriptionPurchase,
): string | null {
  return (
    purchase.store_transaction_id ||
    purchase.transaction_id ||
    purchase.id ||
    null
  );
}

function getPurchaseDate(
  purchase: RevenueCatNonSubscriptionPurchase,
): Date | null {
  if (purchase.purchase_date_ms) {
    return new Date(purchase.purchase_date_ms);
  }

  if (purchase.purchase_date) {
    return new Date(purchase.purchase_date);
  }

  return null;
}

async function fetchRevenueCatSubscriber(
  userId: string,
): Promise<RevenueCatSubscriberResponse> {
  const response = await fetch(
    `${REVENUECAT_API_BASE_URL}/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${getRevenueCatSecretKey()}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `RevenueCat subscriber fetch failed: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}

export async function syncRevenueCatCreditsForUser(
  userId: string,
): Promise<RevenueCatSyncResult> {
  const productId = getCreditsProductId();
  const creditsPerPurchase = getCreditsPerPurchase();
  const subscriber = await fetchRevenueCatSubscriber(userId);
  const purchases =
    subscriber.subscriber?.non_subscriptions?.[productId] ?? [];

  let creditsGranted = 0;
  let processedTransactions = 0;

  for (const purchase of purchases) {
    const transactionId = getPurchaseTransactionId(purchase);
    if (!transactionId) {
      console.warn("[RevenueCat] Skipping purchase without transaction id", {
        userId,
        productId,
      });
      continue;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await (tx as any).revenueCatPurchase.findUnique({
        where: { revenueCatTransactionId: transactionId },
      });

      if (existing) {
        return { created: false, creditsGranted: 0 };
      }

      await grantUserCredits(
        userId,
        CreditType.ANALYSIS,
        creditsPerPurchase,
        tx,
      );

      await (tx as any).revenueCatPurchase.create({
        data: {
          revenueCatTransactionId: transactionId,
          storeTransactionId: purchase.store_transaction_id ?? null,
          userId,
          productId,
          store: purchase.store ?? null,
          purchasedAt: getPurchaseDate(purchase),
          creditsGranted: creditsPerPurchase,
          rawPayload: purchase,
        },
      });

      return { created: true, creditsGranted: creditsPerPurchase };
    });

    if (result.created) {
      processedTransactions += 1;
      creditsGranted += result.creditsGranted;
    }
  }

  return {
    creditsGranted,
    processedTransactions,
  };
}
