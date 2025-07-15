import { NextRequest, NextResponse } from "next/server";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { ApiResponse } from "@/shared/types/api/apiResponse";

type ApiHandler<T> = (request: NextRequest) => Promise<NextResponse>;

const RATE_LIMIT_WINDOW = 15 * 60;
const MAX_REQUESTS = 5;

const rateLimiter = new RateLimiterMemory({
  points: MAX_REQUESTS,
  duration: RATE_LIMIT_WINDOW,
});

export function withRateLimiter<T>(handler: ApiHandler<T>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    try {
      await rateLimiter.consume(ip);
      return handler(req);
    } catch (error) {
      console.error(error);
      return ApiResponse.error(
        "Too many requests, please try again later.",
        429,
      ).toResponse();
    }
  };
}
