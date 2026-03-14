import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import {
  handleOrderPaid,
  handleOrderRefunded,
  handleCustomerCreated,
} from "@/backend/lib/polarWebhookHandlers";
import { polarConfig } from "@/backend/lib/polarConfig";

/**
 * Polar webhook handler using the `standardwebhooks` library for signature
 * verification. We avoid @polar-sh/sdk's validateEvent because it internally
 * uses Zod v3 which is incompatible with this project's Zod v4.
 *
 * Polar follows the Standard Webhooks spec, so the `standardwebhooks` library
 * handles verification correctly.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Verify signature using the Standard Webhooks library.
    // The Webhook constructor expects a base64-encoded secret.
    // Polar secrets are NOT base64-encoded, so we must encode them.
    const encodedSecret = Buffer.from(polarConfig.webhookSecret).toString("base64");
    const wh = new Webhook(encodedSecret);
    try {
      wh.verify(body, headers);
    } catch (error) {
      console.error("[Polar Webhook] Signature verification failed:", error);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 403 }
      );
    }

    // Signature valid — parse event manually to avoid Zod v4 incompatibility
    const event = JSON.parse(body);

    const eventType = event.type as string;

    console.log("[Polar Webhook] Received event:", eventType);

    // Dispatch to appropriate handler
    switch (eventType) {
      case "order.paid":
        await handleOrderPaid(event);
        break;

      case "order.refunded":
        await handleOrderRefunded(event);
        break;

      case "customer.created":
        await handleCustomerCreated(event);
        break;

      case "customer.updated":
        console.log("[Polar Webhook] Customer updated:", event.data?.id);
        break;

      case "checkout.created":
        console.log("[Polar Webhook] Checkout created:", event.data?.id);
        break;

      case "checkout.updated":
        console.log("[Polar Webhook] Checkout updated:", event.data?.id);
        break;

      case "subscription.created":
      case "subscription.active":
      case "subscription.canceled":
      case "subscription.revoked":
        console.log(`[Polar Webhook] Subscription event ${eventType}:`, event.data?.id);
        break;

      default:
        console.log(`[Polar Webhook] Unhandled event type: ${eventType}`);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Polar Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
