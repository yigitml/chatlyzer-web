import { NextRequest } from "next/server";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { withAuthRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiError, apiErrorResponse } from "@/backend/lib/apiBoundary";
import { rotate, accessCookie, refreshCookie } from "@/backend/lib/authSession";

export const POST = withAuthRateLimiter(async (request: NextRequest) => {
  try {
    const token = request.cookies.get("refreshToken")?.value;
    if (!token) throw new ApiError("No refresh token provided", 401);
    const credentials = await rotate(token, false);
    const response = ApiResponse.success({ expiresAt: Math.floor(Date.now() / 1000) + 900 }).toResponse({ "Cache-Control": "no-store" });
    response.headers.append("Set-Cookie", accessCookie(credentials.token));
    response.headers.append("Set-Cookie", refreshCookie(credentials.refreshToken, false));
    return response;
  } catch (error) { return apiErrorResponse(error, "Token refresh failed"); }
});
