import { NextRequest, NextResponse } from "next/server";
import prisma from "@/backend/lib/prisma";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
export const POST = withProtectedRoute(async (request: NextRequest) => {
  try {
    const userId = request.user!.id;
    const sessionId = request.user!.sessionId;

    if (!userId) {
      return ApiResponse.error("Unauthorized", 401).toResponse();
    }

    // Soft-delete only this specific session (not all sessions)
    if (sessionId) {
      await prisma.userSession.update({
        where: {
          userId_sessionId: {
            userId,
            sessionId,
          },
        },
        data: { deletedAt: new Date() },
      });
    }

    const isProduction = process.env.NODE_ENV === "production";
    const securePart = isProduction ? "; Secure" : "";

    const response = ApiResponse.success({
      message: "Logged out successfully",
    }).toResponse();
    response.headers.append("Set-Cookie", `accessToken=; HttpOnly; Path=/; Max-Age=0${securePart}; SameSite=Strict`);
    response.headers.append("Set-Cookie", `refreshToken=; HttpOnly; Path=/api/auth/web/refresh; Max-Age=0${securePart}; SameSite=Strict`);
    return response;
  } catch (error) {
    console.error("Error during logout:", error);
    return ApiResponse.error("Logout failed", 500).toResponse();
  }
});
