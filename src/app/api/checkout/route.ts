import { NextRequest, NextResponse } from "next/server";
import { getPolarConfig } from "@/backend/lib/polarConfig";
import { AuthenticatedRequest } from "@/backend/middleware/combinedMiddleware";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { ApiResponse } from "@/shared/types/api/apiResponse";

/**
 * Checkout route that creates a Polar checkout session directly via the API.
 *
 * We bypass the @polar-sh/nextjs Checkout adapter because it has a Zod v4
 * incompatibility (the SDK was built for Zod v3).
 *
 * Uses the runtime Polar mode configured by admins.
 *
 * Query params:
 *   - mobileRedirect: (optional) app redirect URL for mobile clients
 *   - json: (optional) "true" to return JSON instead of redirecting
 */
function createErrorResponse(
  request: NextRequest,
  returnJson: boolean,
  error: string,
  status: number,
) {
  if (returnJson) {
    return ApiResponse.error(error, status).toResponse();
  }

  const url = new URL("/home", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

function isAllowedMobileRedirect(value: string | null): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "chatlyzer:";
  } catch {
    return false;
  }
}

export const GET = withProtectedRoute(async (request: AuthenticatedRequest) => {
  const { searchParams, origin } = new URL(request.url);
  const returnJson = searchParams.get("json") === "true";

  try {
    const authenticatedUserId = request.user!.id;
    const authenticatedEmail = request.user!.email;
    const polarConfig = await getPolarConfig();

    const productId = searchParams.get("products") || polarConfig.productId;
    const requestedMobileRedirect = searchParams.get("mobileRedirect");
    const mobileRedirect = isAllowedMobileRedirect(requestedMobileRedirect)
      ? requestedMobileRedirect
      : null;

    // Use authenticated user's data instead of user-supplied params
    const metadata = {
      userId: authenticatedUserId,
      polarMode: polarConfig.mode,
      polarVariant: polarConfig.variant,
    };

    console.info("[Checkout] Creating Polar checkout", {
      polarMode: polarConfig.mode,
      polarVariant: polarConfig.variant,
      productId,
      userId: authenticatedUserId,
      hasMobileRedirect: Boolean(mobileRedirect),
    });

    const successUrl = mobileRedirect
      ? `${origin}/checkout/mobile-success?redirect=${encodeURIComponent(mobileRedirect)}&checkout_id={CHECKOUT_ID}`
      : `${polarConfig.webhookDeliveryUrl}/checkout/success?checkout_id={CHECKOUT_ID}`;

    // Build the checkout creation request body
    const body: Record<string, any> = {
      product_id: productId,
      success_url: successUrl,
      customer_email: authenticatedEmail,
      metadata,
    };

    // Create checkout session via the currently selected Polar environment.
    const response = await fetch(`${polarConfig.apiBaseUrl}/checkouts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${polarConfig.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Checkout] Polar API error:", response.status, errorData);

      return createErrorResponse(
        request,
        returnJson,
        "polar_checkout_failed",
        response.status,
      );
    }

    const checkout = await response.json();

    // Return JSON or redirect to the Polar checkout URL
    if (checkout.url) {
      if (returnJson) {
        return ApiResponse.success({ url: checkout.url }).toResponse();
      }
      return NextResponse.redirect(checkout.url);
    }

    console.error("[Checkout] No URL in checkout response:", checkout);
    return createErrorResponse(
      request,
      returnJson,
      "checkout_url_missing",
      500,
    );
  } catch (error) {
    console.error("[Checkout] Error creating checkout:", error);

    // In Next.js, redirect() literally throws an error. We MUST rethrow it
    // or Next.js will catch it here and return a 500/502 instead of redirecting.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    return createErrorResponse(request, returnJson, "checkout_failed", 500);
  }
});
