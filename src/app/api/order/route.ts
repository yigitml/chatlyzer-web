import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { rawPrisma } from "@/backend/lib/prisma";

export const GET = withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const authenticatedUserId = request.user!.id;

    if (id) {
      const order = await rawPrisma.order.findFirst({
        where: {
          id,
          userId: authenticatedUserId,
        },
      });

      if (!order) {
        return ApiResponse.error("Order not found", 404).toResponse();
      }

      return ApiResponse.success(order).toResponse();
    }

    const orders = await rawPrisma.order.findMany({
      where: {
        userId: authenticatedUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return ApiResponse.success(orders).toResponse();
  } catch (error) {
    console.error("Error fetching orders:", error);
    return ApiResponse.error("Failed to fetch orders", 500).toResponse();
  }
});
