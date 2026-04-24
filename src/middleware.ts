import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define your VIP list of allowed mobile and web origins
const allowedOrigins = [
  "https://chatlyzerai.com",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:3000",
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  // =======================================================================
  // 1. CORS PREFLIGHT HANDLER (Only for /api/* routes)
  // Browsers send an OPTIONS request before a POST/PUT to check permissions
  // =======================================================================
  if (isApiRoute && request.method === "OPTIONS") {
    const preflightHeaders = new Headers();
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
  const response = NextResponse.next();

  // Apply CORS dynamically if it's an API route
  if (isApiRoute) {
    if (allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    response.headers.set("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization");
  }

  // =======================================================================
  // 3. GLOBAL SECURITY POLICIES (Applied to ALL matched routes)
  // Note: HSTS, Clickjacking, and MIME-sniffing headers are handled by Nginx
  // =======================================================================
  
  // Disable unused browser APIs
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https://lh3.googleusercontent.com data: blob:",
    "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
    "frame-src https://accounts.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
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