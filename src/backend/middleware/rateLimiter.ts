import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import {
  RateLimiterMemory,
  RateLimiterPostgres,
} from "rate-limiter-flexible";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { getRequiredServerEnv } from "@/shared/config/env";

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
    clearExpiredByTimeout: true,
  });
}

let authRateLimiter: RateLimiter | undefined;
let apiRateLimiter: RateLimiter | undefined;
let analysisRateLimiter: RateLimiter | undefined;

function getAuthRateLimiter() {
  authRateLimiter ??= createRateLimiter({
    keyPrefix: "auth",
    points: 10,
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
      await getAuthRateLimiter().consume(ip);
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
      await getApiRateLimiter().consume(ip);
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
      await getAnalysisRateLimiter().consume(ip);
      return handler(req);
    } catch {
      return ApiResponse.error(
        "Too many analysis requests, please try again later.",
        429,
      ).toResponse();
    }
  };
}
