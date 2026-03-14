import { NextRequest, NextResponse } from "next/server";
import { polarConfig } from "@/backend/lib/polarConfig";

/**
 * Checkout route that creates a Polar checkout session directly via the API.
 * 
 * We bypass the @polar-sh/nextjs Checkout adapter because it has a Zod v4
 * incompatibility (the SDK was built for Zod v3).
 * 
 * Automatically uses sandbox API in development and production API in production.
 * 
 * Query params:
 *   - products: Polar product ID
 *   - customerEmail: (optional) pre-fill customer email
 *   - metadata: (optional) URL-encoded JSON string with custom metadata (e.g. userId)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("products") || polarConfig.productId;
    const customerEmail = searchParams.get("customerEmail");
    const metadataParam = searchParams.get("metadata");
    const mobileRedirect = searchParams.get("mobileRedirect");
    const returnJson = searchParams.get("json") === "true";

    // Parse metadata if provided
    let metadata: Record<string, string> | undefined;
    if (metadataParam) {
      try {
        metadata = JSON.parse(metadataParam);
      } catch {
        return NextResponse.json(
          { error: "Invalid metadata JSON" },
          { status: 400 }
        );
      }
    }

    const successUrl = mobileRedirect || `${polarConfig.webhookDeliveryUrl}/checkout/success`;

    // Build the checkout creation request body
    const body: Record<string, any> = {
      product_id: productId,
      success_url: successUrl,
    };

    if (customerEmail) {
      body.customer_email = customerEmail;
    }

    if (metadata) {
      body.metadata = metadata;
    }

    // Create checkout session via Polar API (sandbox in dev, production in prod)
    const response = await fetch(`${polarConfig.apiBaseUrl}/checkouts/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${polarConfig.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Checkout] Polar API error:", response.status, errorData);
      
      const url = new URL("/home", request.url);
      url.searchParams.set("error", "polar_checkout_failed");
      return NextResponse.redirect(url);
    }

    const checkout = await response.json();
    
    // Return JSON or redirect to the Polar checkout URL
    if (checkout.url) {
      if (returnJson) {
        return NextResponse.json({ url: checkout.url });
      }
      return NextResponse.redirect(checkout.url);
    }

    console.error("[Checkout] No URL in checkout response:", checkout);
    return NextResponse.json(
      { error: "Checkout session created but no URL returned" },
      { status: 500 }
    );
  } catch (error) {
    console.error("[Checkout] Error creating checkout:", error);
    
    // In Next.js, redirect() literally throws an error. We MUST rethrow it 
    // or Next.js will catch it here and return a 500/502 instead of redirecting.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    // Try to safely redirect the user back to the app on failure rather than returning a raw 500 JSON
    try {
      const { searchParams } = new URL(request.url);
      const url = new URL("/home", request.url);
      url.searchParams.set("error", "checkout_failed");
      return NextResponse.redirect(url);
    } catch {
      // Fallback
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
}
