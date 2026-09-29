import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import {
  RateLimiterMemory,
  RateLimiterPostgres,
  RateLimiterRes,
} from "rate-limiter-flexible";
import { getRequiredServerEnv } from "../../shared/config/env";
import { ApiResponse } from "../../shared/types/api/apiResponse";

type ApiHandler = (request: NextRequest) => Promise<NextResponse>;
type RateLimiter = {
  consume: (key: string) => Promise<unknown>;
};

/**
 * Pre-configured rate limiters for different endpoint categories.
 */

type RateLimiterConfig = {
  keyPrefix: string;
  points: number;
  duration: number;
  blockDuration?: number;
};

const globalForRateLimit = globalThis as unknown as {
  rateLimitPool?: Pool;
};

function getRateLimitPool() {
  if (!globalForRateLimit.rateLimitPool) {
    globalForRateLimit.rateLimitPool = new Pool({
      connectionString: getRequiredServerEnv("DATABASE_URL"),
    });
  }

  return globalForRateLimit.rateLimitPool;
}

function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const options = {
    keyPrefix: config.keyPrefix,
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration,
  };

  if (process.env.NODE_ENV !== "production") {
    return new RateLimiterMemory(options);
  }

  return new RateLimiterPostgres({
    ...options,
    storeClient: getRateLimitPool(),
    storeType: "pool",
    tableName: "rate_limits",
    // Prisma migrations create this table before traffic reaches the app.
    // Avoid asynchronous CREATE TABLE racing the first request after startup.
    tableCreated: true,
    clearExpiredByTimeout: true,
  });
}

let authRateLimiter: RateLimiter | undefined;
let apiRateLimiter: RateLimiter | undefined;
let analysisRateLimiter: RateLimiter | undefined;

function getAuthRateLimiter() {
  authRateLimiter ??= createRateLimiter({
    keyPrefix: "auth_v2",
    points: 30,
    duration: 15 * 60,
    blockDuration: 60,
  });
  return authRateLimiter;
}

function getApiRateLimiter() {
  apiRateLimiter ??= createRateLimiter({
    keyPrefix: "api",
    points: 60,
    duration: 60,
  });
  return apiRateLimiter;
}

function getAnalysisRateLimiter() {
  analysisRateLimiter ??= createRateLimiter({
    keyPrefix: "analysis",
    points: 5,
    duration: 60,
  });
  return analysisRateLimiter;
}

/**
 * Extract client IP from request headers.
 * Prefer CDN-provided client IP headers before generic proxy headers. If the
 * deployment proxy does not forward these, rate limits can collapse all users
 * into a shared server/proxy IP bucket.
 */
export function getClientIp(req: NextRequest): string {
  const cloudflareIp = normalizeIp(req.headers.get("cf-connecting-ip"));
  if (cloudflareIp) return cloudflareIp;

  const trueClientIp = normalizeIp(req.headers.get("true-client-ip"));
  if (trueClientIp) return trueClientIp;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstForwardedIp = normalizeIp(forwarded.split(",")[0]);
    if (firstForwardedIp) return firstForwardedIp;
  }

  return normalizeIp(req.headers.get("x-real-ip")) || "unknown";
}

function normalizeIp(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("[") && trimmed.includes("]")) {
    return trimmed.slice(1, trimmed.indexOf("]"));
  }

  const withoutPort = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  return withoutPort?.[1] ?? trimmed;
}

/**
 * Rate-limit wrapper for auth endpoints (login, register, refresh).
 * Strict: 10 requests per 15 minutes per IP.
 */
export function withAuthRateLimiter(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = getClientIp(req);
    const key = `${req.nextUrl.pathname}:${ip}`;
    try {
      await getAuthRateLimiter().consume(key);
    } catch (error) {
      if (!(error instanceof RateLimiterRes)) {
        console.error("Rate limit database unavailable", error);
        return ApiResponse.error("Service temporarily unavailable", 503).toResponse();
      }
      return ApiResponse.error(
        "Too many requests, please try again later.",
        429,
      ).toResponse();
    }
    return handler(req);
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
      await getApiRateLimiter().consume(ip);
    } catch (error) {
      if (!(error instanceof RateLimiterRes)) {
        console.error("Rate limit database unavailable", error);
        return ApiResponse.error("Service temporarily unavailable", 503).toResponse();
      }
      return ApiResponse.error(
        "Too many requests, please try again later.",
        429,
      ).toResponse();
    }
    return handler(req);
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
      await getAnalysisRateLimiter().consume(ip);
    } catch (error) {
      if (!(error instanceof RateLimiterRes)) {
        console.error("Rate limit database unavailable", error);
        return ApiResponse.error("Service temporarily unavailable", 503).toResponse();
      }
      return ApiResponse.error(
        "Too many analysis requests, please try again later.",
        429,
      ).toResponse();
    }
    return handler(req);
  };
}
