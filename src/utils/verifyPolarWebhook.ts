/**
 * Verify the signature of a Polar.sh webhook payload
 * @param payload - The payload of the webhook
 * @param signature - The signature of the webhook
 * @param webhookId - The id of the webhook
 * @param webhookTimestamp - The timestamp of the webhook
 */
export function verifyPolarWebhook(
  payload: string,
  signature: string | null,
  webhookId: string | null,
  webhookTimestamp: string | null,
): boolean {
  // TODO: Integrate Polar.sh integration here
  // https://docs.polar.sh/integrate/webhooks/endpoints

  if (!signature || !webhookId || !webhookTimestamp) {
    console.warn("Missing required webhook headers");
    return false;
  }

  return false;
}
