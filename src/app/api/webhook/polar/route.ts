import { NextRequest } from "next/server";
import { processPolarWebhook } from "@/backend/lib/polarWebhookProcessor";

/**
 * Backwards-compatible Polar webhook route.
 *
 * Prefer configuring Polar dashboards to use the explicit routes:
 *   - /api/webhook/polar/sandbox
 *   - /api/webhook/polar/production
 */
export async function POST(request: NextRequest) {
  return processPolarWebhook(request, ["sandbox", "production"]);
}
