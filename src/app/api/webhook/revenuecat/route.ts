import { NextRequest, NextResponse } from "next/server";
import {
  getRevenueCatWebhookUserIds,
  syncRevenueCatCreditsForUser,
  type RevenueCatWebhookPayload,
} from "@/backend/lib/revenueCat";
import { getRequiredServerEnv } from "@/shared/config/env";

function isAuthorized(request: NextRequest): boolean {
  const expectedAuthorization = getRequiredServerEnv("REVENUECAT_WEBHOOK_SECRET");
  return request.headers.get("authorization") === expectedAuthorization;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: RevenueCatWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userIds = getRevenueCatWebhookUserIds(payload);
  if (userIds.length === 0) {
    return NextResponse.json({
      received: true,
      ignored: true,
      reason: "missing_app_user_id",
    });
  }

  const syncResults = await Promise.all(
    userIds.map((userId) => syncRevenueCatCreditsForUser(userId)),
  );

  return NextResponse.json({
    received: true,
    eventId: payload.event?.id ?? null,
    eventType: payload.event?.type ?? null,
    syncedUsers: userIds.length,
    creditsGranted: syncResults.reduce(
      (total, result) => total + result.creditsGranted,
      0,
    ),
    processedTransactions: syncResults.reduce(
      (total, result) => total + result.processedTransactions,
      0,
    ),
  });
}
