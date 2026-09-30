import { NextRequest } from "next/server";
import { rawPrisma } from "@/backend/lib/prisma";
import { lockActiveAccount } from "@/backend/lib/accountLock";
import { apiErrorResponse } from "@/backend/lib/apiBoundary";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
export const POST = withProtectedRoute(async (request: NextRequest) => {
  try {
    const userId = request.user!.id;
    const sessionId = request.user!.sessionId;

    if (!userId) {
      return ApiResponse.error("Unauthorized", 401).toResponse();
    }

    await rawPrisma.$transaction(async tx => {
      await lockActiveAccount(tx, userId, request.user!.tokenVersion);
      await tx.userSession.updateMany({
        where: { userId, sessionId, loginGeneration: request.user!.loginGeneration, deletedAt: null },
        data: { deletedAt: new Date(), refreshTokenVersion: { increment: 1 } },
      });
    });

    const isProduction = process.env.NODE_ENV === "production";
    const securePart = isProduction ? "; Secure" : "";

    const response = ApiResponse.success({
      message: "Logged out successfully",
    }).toResponse();
    response.headers.append("Set-Cookie", `accessToken=; HttpOnly; Path=/; Max-Age=0${securePart}; SameSite=Strict`);
    response.headers.append("Set-Cookie", `refreshToken=; HttpOnly; Path=/api/auth/web/refresh; Max-Age=0${securePart}; SameSite=Strict`);
    return response;
  } catch (error) {
    return apiErrorResponse(error, "Logout failed");
  }
});
