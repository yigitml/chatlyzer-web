import { NextRequest } from "next/server";
import prisma from "@/backend/lib/prisma";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
export const POST = withProtectedRoute(async (request: NextRequest) => {
  try {
    const userId = request.user!.id;
    if (!userId) {
      return ApiResponse.error("Unauthorized", 401).toResponse();
    }

    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    return ApiResponse.success({
      message: "Logged out successfully",
    }).toResponse({
      "Set-Cookie": `refreshToken=; HttpOnly; Path=/api/auth/mobile/refresh; Max-Age=0; Secure; SameSite=Strict`,
    });
  } catch (error) {
    console.error("Error during logout:", error);
    return ApiResponse.error("Logout failed", 500).toResponse();
  }
});
