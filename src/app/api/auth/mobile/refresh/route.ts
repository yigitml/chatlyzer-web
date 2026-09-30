import { NextRequest } from "next/server";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { withAuthRateLimiter } from "@/backend/middleware/rateLimiter";
import { authRefreshSchema } from "@/shared/types/api/requestSchemas";
import { ApiError, apiErrorResponse, readJson } from "@/backend/lib/apiBoundary";
import { rotate, refreshCookie } from "@/backend/lib/authSession";

export const POST = withAuthRateLimiter(async (request: NextRequest) => {
  try {
    let bodyToken: string | undefined;
    if (request.body !== null) {
      const parsed = authRefreshSchema.safeParse(await readJson(request, 32768));
      if (!parsed.success) throw new ApiError("Invalid refresh request", 400);
      bodyToken = parsed.data.refreshToken;
    }
    const token = bodyToken || request.cookies.get("refreshToken")?.value;
    if (!token) throw new ApiError("No refresh token provided", 401);
    const credentials = await rotate(token, true);
    return ApiResponse.success({ ...credentials, expiresAt: new Date(Date.now() + 900000).toISOString() })
      .toResponse({ "Set-Cookie": refreshCookie(credentials.refreshToken, true), "Cache-Control": "no-store" });
  } catch (error) { return apiErrorResponse(error, "Token refresh failed"); }
});
