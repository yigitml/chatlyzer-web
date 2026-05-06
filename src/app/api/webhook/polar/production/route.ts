import { NextRequest } from "next/server";
import { processPolarWebhook } from "@/backend/lib/polarWebhookProcessor";

export async function POST(request: NextRequest) {
  return processPolarWebhook(request, ["production"]);
}
