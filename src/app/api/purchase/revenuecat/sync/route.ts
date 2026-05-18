import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import prisma, { rawPrisma } from "@/backend/lib/prisma";
import { grantUserCredits } from "@/backend/lib/consumeUserCredits";
import { CreditType } from "@/generated/client/client";

const DEFAULT_CREDITS_PRODUCT_ID = "credits_24";
const CREDITS_PER_PURCHASE = 24;

type RevenueCatPurchase = {
  id?: string;
  store_transaction_id?: string;
  purchase_date?: string;
  is_sandbox?: boolean;
};

type RevenueCatSubscriberResponse = {
  subscriber?: {
    non_subscriptions?: Record<string, RevenueCatPurchase[]>;
  };
};

function getRevenueCatProductId(): string {
  return (
    process.env.REVENUECAT_CREDITS_PRODUCT_ID ||
    process.env.EXPO_PUBLIC_REVENUECAT_CREDITS_PRODUCT_ID ||
    DEFAULT_CREDITS_PRODUCT_ID
  );
}

function getRevenueCatApiKey(): string {
  const apiKey = process.env.REVENUECAT_REST_API_KEY;
  if (!apiKey) {
    throw new Error("Missing REVENUECAT_REST_API_KEY");
  }
  return apiKey;
}

function getTransactionId(purchase: RevenueCatPurchase): string | null {
  return purchase.store_transaction_id || purchase.id || null;
}

async function fetchRevenueCatSubscriber(
  userId: string,
): Promise<RevenueCatSubscriberResponse> {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${getRevenueCatApiKey()}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text();
    console.error("[RevenueCat] Subscriber fetch failed", {
      status: response.status,
      details,
    });
    throw new Error("RevenueCat subscriber fetch failed");
  }

  return response.json();
}

export const POST = withProtectedRoute(async (request: NextRequest) => {
  try {
    const userId = request.user!.id;
    const productId = getRevenueCatProductId();
    const subscriber = await fetchRevenueCatSubscriber(userId);
    const purchases =
      subscriber.subscriber?.non_subscriptions?.[productId] ?? [];

    let creditsGranted = 0;
    let processedTransactions = 0;

    for (const purchase of purchases) {
      const transactionId = getTransactionId(purchase);
      if (!transactionId) continue;

      const orderId = `revenuecat:${transactionId}`;
      const existingOrder = await rawPrisma.order.findUnique({
        where: {
          polarOrderId_polarMode: {
            polarOrderId: orderId,
            polarMode: "revenuecat",
          },
        },
      });

      if (existingOrder) continue;

      await prisma.$transaction(async (tx) => {
        await grantUserCredits(
          userId,
          CreditType.ANALYSIS,
          CREDITS_PER_PURCHASE,
          tx,
        );

        await tx.order.create({
          data: {
            polarOrderId: orderId,
            polarMode: "revenuecat",
            userId,
            productId,
            amount: 0,
            currency: "usd",
            creditsGranted: CREDITS_PER_PURCHASE,
            status: purchase.is_sandbox ? "paid_sandbox" : "paid",
          },
        });
      });

      creditsGranted += CREDITS_PER_PURCHASE;
      processedTransactions += 1;
    }

    return ApiResponse.success({
      creditsGranted,
      processedTransactions,
    }).toResponse();
  } catch (error) {
    console.error("[RevenueCat] Purchase sync failed:", error);
    return ApiResponse.error("Failed to sync purchases", 500).toResponse();
import { AuthenticatedRequest } from "@/backend/middleware/combinedMiddleware";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { syncRevenueCatCreditsForUser } from "@/backend/lib/revenueCat";
import { ApiResponse } from "@/shared/types/api/apiResponse";

export const POST = withProtectedRoute(async (request: AuthenticatedRequest) => {
  try {
    const result = await syncRevenueCatCreditsForUser(request.user!.id);
    return ApiResponse.success(result).toResponse();
  } catch (error) {
    console.error("[RevenueCat] Failed to sync mobile purchases:", error);
    return ApiResponse.error("revenuecat_sync_failed", 500).toResponse();
  }
});
