import { NextRequest } from "next/server";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { verifyGoogleIdToken } from "@/backend/lib/verifyGoogleIdToken";
import { withAuthRateLimiter } from "@/backend/middleware/rateLimiter";
import { toPublicUser } from "@/shared/types/api/publicDtos";
import { login, tokens, refreshCookie } from "@/backend/lib/authSession";
import { ApiError, apiErrorResponse, readJson } from "@/backend/lib/apiBoundary";

export const POST = withAuthRateLimiter(async (request: NextRequest) => {
  try {
    const data = await readJson(request, 32768) as Record<string, unknown> | null;
    if (!data || typeof data.accessToken !== "string" || !data.accessToken || typeof data.deviceId !== "string" ||
      data.deviceId.length < 8 || data.deviceId.length > 200) throw new ApiError("Invalid login request", 400);
    const identity = await verifyGoogleIdToken(data.accessToken);
    const { user, loginGeneration, refreshTokenVersion } = await login(identity, data.deviceId, true);
    const credentials = tokens(user, data.deviceId, true, loginGeneration, refreshTokenVersion);
    return ApiResponse.success({ ...credentials, expiresAt: new Date(Date.now() + 900000).toISOString(), user: toPublicUser(user) })
      .toResponse({ "Set-Cookie": refreshCookie(credentials.refreshToken, true), "Cache-Control": "no-store" });
  } catch (error) { return apiErrorResponse(error, "Authentication failed"); }
});
