import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import prisma from "@/backend/lib/prisma";

export const GET = withProtectedRoute(async (request: NextRequest) => {
  try {
    const credits = await prisma.userCredit.findMany({
      where: {
        userId: request.user!.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return ApiResponse.success(credits).toResponse();
  } catch (error) {
    console.error("Error fetching user credits:", error);
    return ApiResponse.error("Failed to fetch user credits", 500).toResponse();
  }
});
