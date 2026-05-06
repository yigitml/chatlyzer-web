import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import {
  getPolarConfigForMode,
  PolarMode,
} from "@/backend/lib/polarConfig";
import {
  handleCustomerCreated,
  handleOrderPaid,
  handleOrderRefunded,
} from "@/backend/lib/polarWebhookHandlers";

function buildHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

function verifyWebhook(
  body: string,
  headers: Record<string, string>,
  mode: PolarMode,
): boolean {
  const config = getPolarConfigForMode(mode);
  const encodedSecret = Buffer.from(config.webhookSecret).toString("base64");
  const webhook = new Webhook(encodedSecret);

  try {
    webhook.verify(body, headers);
    return true;
  } catch {
    return false;
  }
}

async function dispatchPolarEvent(event: any, polarMode: PolarMode) {
  const eventType = event.type as string;

  console.log("[Polar Webhook] Received event:", {
    eventType,
    polarMode,
    id: event.data?.id,
  });

  switch (eventType) {
    case "order.paid":
      await handleOrderPaid(event, polarMode);
      break;

    case "order.refunded":
      await handleOrderRefunded(event, polarMode);
      break;

    case "customer.created":
      await handleCustomerCreated(event, polarMode);
      break;

    case "customer.updated":
      console.log("[Polar Webhook] Customer updated:", {
        customerId: event.data?.id,
        polarMode,
      });
      break;

    case "checkout.created":
      console.log("[Polar Webhook] Checkout created:", {
        checkoutId: event.data?.id,
        polarMode,
      });
      break;

    case "checkout.updated":
      console.log("[Polar Webhook] Checkout updated:", {
        checkoutId: event.data?.id,
        polarMode,
      });
      break;

    case "subscription.created":
    case "subscription.active":
    case "subscription.canceled":
    case "subscription.revoked":
      console.log("[Polar Webhook] Subscription event:", {
        eventType,
        subscriptionId: event.data?.id,
        polarMode,
      });
      break;

    default:
      console.log("[Polar Webhook] Unhandled event type:", {
        eventType,
        polarMode,
      });
      break;
  }
}

export async function processPolarWebhook(
  request: NextRequest,
  allowedModes: PolarMode[],
) {
  try {
    const body = await request.text();
    const headers = buildHeaders(request);

    const verifiedMode = allowedModes.find((mode) =>
      verifyWebhook(body, headers, mode),
    );

    if (!verifiedMode) {
      console.error("[Polar Webhook] Signature verification failed");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 403 },
      );
    }

    const event = JSON.parse(body);
    await dispatchPolarEvent(event, verifiedMode);

    return NextResponse.json(
      { received: true, polarMode: verifiedMode },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Polar Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
