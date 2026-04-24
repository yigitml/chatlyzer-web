import { NextRequest, NextResponse } from "next/server";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { ApiResponse } from "@/shared/types/api/apiResponse";

type ApiHandler = (request: NextRequest) => Promise<NextResponse>;

/**
 * Pre-configured rate limiters for different endpoint categories.
 *
 * NOTE: RateLimiterMemory resets on server restart and does not
 * share state across multiple instances. For production at scale,
 * replace with RateLimiterRedis or RateLimiterPostgres.
 */

// Auth endpoints — strict limits to prevent credential stuffing / brute force
const authRateLimiter = new RateLimiterMemory({
  points: 10,         // 10 attempts
  duration: 15 * 60,  // per 15-minute window
  blockDuration: 60,  // block for 60s after exceeding
});

// API endpoints — moderate limits for general usage
const apiRateLimiter = new RateLimiterMemory({
  points: 60,          // 60 requests
  duration: 60,        // per minute
});

// Analysis endpoints — tight limits (expensive OpenAI calls)
const analysisRateLimiter = new RateLimiterMemory({
  points: 5,           // 5 analyses
  duration: 60,        // per minute
});

/**
 * Extract client IP from request headers.
 * Takes the first IP from x-forwarded-for to handle proxies.
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take only the first (client) IP, ignore proxy chain
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Rate-limit wrapper for auth endpoints (login, register, refresh).
 * Strict: 10 requests per 15 minutes per IP.
 */
export function withAuthRateLimiter(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = getClientIp(req);
    try {
      await authRateLimiter.consume(ip);
      return handler(req);
    } catch {
      return ApiResponse.error(
        "Too many requests, please try again later.",
        429,
      ).toResponse();
    }
  };
}

/**
 * Rate-limit wrapper for general API endpoints.
 * Moderate: 60 requests per minute per IP.
 */
export function withRateLimiter(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = getClientIp(req);
    try {
      await apiRateLimiter.consume(ip);
      return handler(req);
    } catch {
      return ApiResponse.error(
        "Too many requests, please try again later.",
        429,
      ).toResponse();
    }
  };
}

/**
 * Rate-limit wrapper for analysis endpoints (OpenAI calls).
 * Tight: 5 requests per minute per IP.
 */
export function withAnalysisRateLimiter(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = getClientIp(req);
    try {
      await analysisRateLimiter.consume(ip);
      return handler(req);
    } catch {
      return ApiResponse.error(
        "Too many analysis requests, please try again later.",
        429,
      ).toResponse();
    }
  };
}
