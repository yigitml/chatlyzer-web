/**
 * Polar configuration that auto-switches between sandbox and production.
 * 
 * In development (npm run dev):
 *   - Uses POLAR_SANDBOX_ACCESS_TOKEN
 *   - Uses sandbox-api.polar.sh
 *   - Uses POLAR_SANDBOX_WEBHOOK_SECRET
 *   - Uses POLAR_SANDBOX_PROJ_ID
 *   - Uses POLAR_SANDBOX_WEBHOOK_DELIVERY_URL for success redirect
 * 
 * In production (npm run build / npm start):
 *   - Uses POLAR_ACCESS_TOKEN
 *   - Uses api.polar.sh
 *   - Uses POLAR_WEBHOOK_SECRET
 *   - Uses POLAR_PROJ_ID
 *   - Uses WEBHOOK_DELIVERY_URL for success redirect
 */

const isDev = process.env.NODE_ENV !== "production";

export const polarConfig = {
  /** Polar API access token */
  accessToken: isDev
    ? process.env.POLAR_SANDBOX_ACCESS_TOKEN!
    : process.env.POLAR_ACCESS_TOKEN!,

  /** Polar API base URL */
  apiBaseUrl: isDev
    ? "https://sandbox-api.polar.sh/v1"
    : "https://api.polar.sh/v1",

  /** Polar webhook signing secret */
  webhookSecret: isDev
    ? process.env.POLAR_SANDBOX_WEBHOOK_SECRET!
    : process.env.POLAR_WEBHOOK_SECRET!,

  /** Polar project/organization ID */
  projectId: isDev
    ? process.env.POLAR_SANDBOX_PROJ_ID!
    : process.env.POLAR_PROJ_ID!,

  /** Product ID for the 24 credits pack */
  productId: isDev
    ? "a12a46b9-c27f-499e-b63a-120847367b6b"
    : "012db903-b8df-4ff4-ad41-aa5636ce18b3",

  /** Base URL for checkout success redirect */
  webhookDeliveryUrl: isDev
    ? process.env.POLAR_SANDBOX_WEBHOOK_DELIVERY_URL!
    : process.env.WEBHOOK_DELIVERY_URL!,
};
