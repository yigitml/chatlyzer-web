import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { rawPrisma } from "@/backend/lib/prisma";
import { getPagination, paginateResults, paginationHeaders } from "@/shared/utils/pagination";

export const GET = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const authenticatedUserId = request.user!.id;

    if (id) {
      const order = await rawPrisma.order.findFirst({
        where: {
          id,
          userId: authenticatedUserId,
          deletedAt: null,
        },
      });

      if (!order) {
        return ApiResponse.error("Order not found", 404).toResponse();
      }

      return ApiResponse.success(order).toResponse();
    }

    const pagination = getPagination(searchParams);
    const orders = await rawPrisma.order.findMany({
      where: {
        userId: authenticatedUserId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: pagination.take,
      ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
    });

    const page = paginateResults(orders, pagination.limit);
    return ApiResponse.success(page.items).toResponse(paginationHeaders(page.pageInfo));
  } catch (error) {
    console.error("Error fetching orders:", error);
    return ApiResponse.error("Failed to fetch orders", 500).toResponse();
  }
}));
