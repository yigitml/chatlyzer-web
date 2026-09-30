import { NextRequest } from "next/server";
import { rawPrisma } from "@/backend/lib/prisma";
import { lockActiveAccount } from "@/backend/lib/accountLock";
import { apiErrorResponse } from "@/backend/lib/apiBoundary";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
export const POST = withProtectedRoute(async (request: NextRequest) => {
  try {
    const userId = request.user!.id;
    const deviceId = request.user!.deviceId;

    if (!userId) {
      return ApiResponse.error("Unauthorized", 401).toResponse();
    }

    await rawPrisma.$transaction(async tx => {
      await lockActiveAccount(tx, userId, request.user!.tokenVersion);
      await tx.userDevice.updateMany({
        where: { userId, deviceId, loginGeneration: request.user!.loginGeneration, deletedAt: null },
        data: { deletedAt: new Date(), refreshTokenVersion: { increment: 1 } },
      });
    });

    return ApiResponse.success({
      message: "Logged out successfully",
    }).toResponse({
      "Set-Cookie": `refreshToken=; HttpOnly; Path=/api/auth/mobile/refresh; Max-Age=0; Secure; SameSite=Strict`,
    });
  } catch (error) {
    return apiErrorResponse(error, "Logout failed");
  }
});
