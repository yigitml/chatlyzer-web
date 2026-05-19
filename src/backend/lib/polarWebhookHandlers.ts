import prisma, { rawPrisma } from "@/backend/lib/prisma";
import { grantUserCredits } from "@/backend/lib/consumeUserCredits";
import { CreditType } from "../../generated/client/client";
import type { PolarMode } from "@/backend/lib/polarConfig";

const CREDITS_PER_PURCHASE = 24;

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Resolve the user from the webhook payload.
 * Tries metadata.userId first, then falls back to customerEmail lookup.
 */
async function resolveUser(
  metadata: Record<string, string> | undefined,
  customerEmail?: string,
) {
  // Try to find by metadata.userId
  if (metadata?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: metadata.userId },
    });
    if (user && !user.deletedAt && user.isActive) return user;
  }

  // Fallback: find by customer email
  if (customerEmail) {
    const user = await prisma.user.findUnique({
      where: { email: customerEmail },
    });
    if (user && !user.deletedAt && user.isActive) return user;
  }

  return null;
}

export async function handleOrderPaid(payload: any, polarMode: PolarMode) {
  const { data } = payload;
  const metadata = data.metadata as Record<string, string> | undefined;
  const customerEmail = data.customer?.email;

  console.log("[Polar Webhook] onOrderPaid received:", {
    orderId: data.id,
    productId: data.product?.id,
    metadata,
    customerEmail,
    polarMode,
  });

  const user = await resolveUser(metadata, customerEmail);
  if (!user) {
    console.error("[Polar Webhook] Could not resolve user for order:", data.id);
    return;
  }

// Check for duplicate order processing (idempotency)
  const existingOrder = await (rawPrisma as any).order.findUnique({
    where: {
      polarOrderId_polarMode: {
        polarOrderId: data.id,
        polarMode,
      },
    },
  });
  if (existingOrder) {
    console.log("[Polar Webhook] Order already processed:", {
      orderId: data.id,
      polarMode,
    });
    return;
  }

  let creditsToGrant = CREDITS_PER_PURCHASE;

  // Sandbox logic: Only grant actual credits if the user is an admin
  if (polarMode === "sandbox" && !isAdminEmail(user.email)) {
    console.log("[Polar Webhook] Sandbox payment for non-admin. No credits will be granted.");
    creditsToGrant = 0;
  }

  // Grant credits if applicable
  if (creditsToGrant > 0) {
    await grantUserCredits(user.id, CreditType.ANALYSIS, creditsToGrant);
  }

  // Create order record for audit trail
  await (rawPrisma as any).order.create({
    data: {
      polarOrderId: data.id,
      polarMode,
      userId: user.id,
      productId: data.product?.id || "unknown",
      amount: data.amount || 0,
      currency: data.currency || "usd",
      creditsGranted: creditsToGrant,
      status: "paid",
    },
  });

  console.log(
    `[Polar Webhook] Granted ${creditsToGrant} ANALYSIS credits to user ${user.id}`,
  );
}

export async function handleOrderRefunded(payload: any, polarMode: PolarMode) {
  const { data } = payload;
  const metadata = data.metadata as Record<string, string> | undefined;
  const customerEmail = data.customer?.email;

  console.log("[Polar Webhook] onOrderRefunded received:", {
    orderId: data.id,
    polarMode,
  });

  const user = await resolveUser(metadata, customerEmail);
  if (!user) {
    console.error(
      "[Polar Webhook] Could not resolve user for refunded order:",
      data.id,
    );
    return;
  }

  // Update order status
  const order = await (rawPrisma as any).order.findUnique({
    where: {
      polarOrderId_polarMode: {
        polarOrderId: data.id,
        polarMode,
      },
    },
  });

  if (order) {
    await (rawPrisma as any).order.update({
      where: {
        polarOrderId_polarMode: {
          polarOrderId: data.id,
          polarMode,
        },
      },
      data: { status: "refunded" },
    });

    // Deduct the credits that were granted
    const { consumeUserCredits } =
      await import("@/backend/lib/consumeUserCredits");
    const deducted = await consumeUserCredits(
      user.id,
      CreditType.ANALYSIS,
      order.creditsGranted,
    );

    if (!deducted) {
      console.warn(
        `[Polar Webhook] Could not deduct ${order.creditsGranted} credits for refund (user may have used them)`,
      );
    } else {
      console.log(
        `[Polar Webhook] Deducted ${order.creditsGranted} ANALYSIS credits from user ${user.id} due to refund`,
      );
    }
  }
}

export async function handleCustomerCreated(
  payload: any,
  polarMode: PolarMode,
) {
  const { data } = payload;
  const metadata = data.metadata as Record<string, string> | undefined;
  const customerEmail = data.email;

  console.log("[Polar Webhook] onCustomerCreated received:", {
    customerId: data.id,
    email: customerEmail,
    polarMode,
  });

  const user = await resolveUser(metadata, customerEmail);
  if (!user) {
    console.error(
      "[Polar Webhook] Could not resolve user for customer:",
      data.id,
    );
    return;
  }

  // Link Polar customer ID to our user
  await rawPrisma.user.update({
    where: { id: user.id },
    data: { polarCustomerId: data.id },
  });

  console.log(
    `[Polar Webhook] Linked Polar customer ${data.id} to user ${user.id}`,
  );
}
