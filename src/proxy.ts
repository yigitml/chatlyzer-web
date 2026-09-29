import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Explicit cross-origin clients. Same-origin web requests do not need CORS.
const mobileOrigins = [
  "https://chatlyzerai.com",
  "capacitor://localhost",
  "http://localhost",
];

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigins = [
    ...mobileOrigins,
    ...(process.env.CORS_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean),
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000"] : []),
  ];
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const csp = buildContentSecurityPolicy(nonce);

  // =======================================================================
  // 1. CORS PREFLIGHT HANDLER (Only for /api/* routes)
  // Browsers send an OPTIONS request before a POST/PUT to check permissions
  // =======================================================================
  if (isApiRoute && request.method === "OPTIONS") {
    const preflightHeaders = new Headers({ Vary: "Origin" });
    if (allowedOrigins.includes(origin)) {
      preflightHeaders.set("Access-Control-Allow-Origin", origin);
    }
    preflightHeaders.set("Access-Control-Allow-Credentials", "true");
    preflightHeaders.set("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    preflightHeaders.set("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization");

    return new NextResponse(null, { headers: preflightHeaders, status: 204 });
  }

  // =======================================================================
  // 2. STANDARD REQUEST HANDLER
  // =======================================================================
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("X-Request-Id", requestId);

  // Apply CORS dynamically if it's an API route
  if (isApiRoute) {
    response.headers.append("Vary", "Origin");
    response.headers.set("Access-Control-Expose-Headers", "X-Next-Cursor, X-Has-More, X-Page-Limit, X-Request-Id");
    if (allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    response.headers.set("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization");
  }

  // =======================================================================
  // 3. GLOBAL SECURITY POLICIES (Applied to ALL matched routes)
  // These protections travel with the app; no VPS/Nginx is required.
  // =======================================================================
  
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  }

  // Disable unused browser APIs
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

function buildContentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://apis.google.com https://js.stripe.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https://lh3.googleusercontent.com data: blob:",
    "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://api.revenuecat.com https://e.revenue.cat https://api.stripe.com https://r.stripe.com",
    "frame-src https://accounts.google.com https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/**
 * Match all routes except static assets and Next.js internals.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icons, images
     */
    "/((?!_next/static|_next/image|favicon.ico|iconsvg.svg|images/).*)",
  ],
};
