import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import prisma from "@/backend/lib/prisma";
import { getPagination, paginateResults, paginationHeaders } from "@/shared/utils/pagination";

export const GET = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const pagination = getPagination(searchParams);
    const credits = await prisma.userCredit.findMany({
      where: {
        userId: request.user!.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: pagination.take,
      ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
    });

    const page = paginateResults(credits, pagination.limit);
    return ApiResponse.success(page.items).toResponse(paginationHeaders(page.pageInfo));
  } catch (error) {
    console.error("Error fetching user credits:", error);
    return ApiResponse.error("Failed to fetch user credits", 500).toResponse();
  }
}));
