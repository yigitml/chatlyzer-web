import { NextRequest } from "next/server";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { withAuthRateLimiter } from "@/backend/middleware/rateLimiter";
import { toPublicUser } from "@/shared/types/api/publicDtos";
import { verifyGoogleIdToken } from "@/backend/lib/verifyGoogleIdToken";
import { login, tokens, accessCookie, refreshCookie } from "@/backend/lib/authSession";
import { ApiError, apiErrorResponse, readJson } from "@/backend/lib/apiBoundary";

function csrfCookie(value: string, maxAge: number) {
  return `loginCsrf=${value}; HttpOnly; Path=/api/auth/web; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}; SameSite=Strict`;
}
function allowedOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : request.nextUrl.origin;
}
/** Browser initiation binds the following credential exchange to this browser. */
export const GET = withAuthRateLimiter(async () => {
  const csrfToken = randomBytes(32).toString("hex");
  return ApiResponse.success({ csrfToken }).toResponse({ "Set-Cookie": csrfCookie(csrfToken, 600), "Cache-Control": "no-store" });
});
export const POST = withAuthRateLimiter(async (request: NextRequest) => {
  try {
    if (request.headers.get("origin") !== allowedOrigin(request)) throw new ApiError("Untrusted login origin", 403);
    const csrfHeader = request.headers.get("x-csrf-token") || "";
    const csrf = request.cookies.get("loginCsrf")?.value || "";
    if (!/^[a-f0-9]{64}$/.test(csrf) || csrfHeader.length !== csrf.length ||
      !timingSafeEqual(Buffer.from(csrf), Buffer.from(csrfHeader))) throw new ApiError("Invalid login state", 403);
    const data = await readJson(request, 32768) as Record<string, unknown> | null;
    if (!data || typeof data.idToken !== "string" || !data.idToken || typeof data.sessionId !== "string" ||
      data.sessionId.length < 8 || data.sessionId.length > 200) throw new ApiError("Invalid login request", 400);
    const identity = await verifyGoogleIdToken(data.idToken);
    const { user, loginGeneration, refreshTokenVersion } = await login(identity, data.sessionId, false);
    const credentials = tokens(user, data.sessionId, false, loginGeneration, refreshTokenVersion);
    const response = ApiResponse.success({ expiresAt: Math.floor(Date.now() / 1000) + 900, user: toPublicUser(user) }).toResponse({ "Cache-Control": "no-store" });
    response.headers.append("Set-Cookie", accessCookie(credentials.token));
    response.headers.append("Set-Cookie", refreshCookie(credentials.refreshToken, false));
    response.headers.append("Set-Cookie", csrfCookie("", 0));
    return response;
  } catch (error) { return apiErrorResponse(error, "Authentication failed"); }
});
