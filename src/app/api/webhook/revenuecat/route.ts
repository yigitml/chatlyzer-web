import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { processRevenueCatWebhook, type RevenueCatWebhookPayload } from "@/backend/lib/revenueCat";
import { getRequiredServerEnv } from "@/shared/config/env";
import { readJson, apiErrorResponse } from "@/backend/lib/apiBoundary";

export async function POST(request: NextRequest) {
  const expected = Buffer.from(getRequiredServerEnv("REVENUECAT_WEBHOOK_SECRET"));
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = await readJson(request, 256 * 1024) as RevenueCatWebhookPayload;
    const result = await processRevenueCatWebhook(payload);
    return NextResponse.json({ received: true, eventId: payload.event?.id, ...result });
  } catch (error) { return apiErrorResponse(error, "RevenueCat webhook could not be processed"); }
}
