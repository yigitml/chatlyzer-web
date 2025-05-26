import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/middleware/jwtAuth";
import { ApiResponse } from "@/types/api/apiResponse";
import prisma from "@/lib/prisma";
import type { SubscriptionDeleteRequest } from "@/types/api/apiRequest";

export const GET = withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const authenticatedUserId = request.user!.id;

    if (id) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          id,
          userId: authenticatedUserId,
        },
      });

      if (!subscription) {
        return ApiResponse.error("Subscription not found", 404).toResponse();
      }

      return ApiResponse.success(subscription).toResponse();
    }

    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: authenticatedUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return ApiResponse.success(subscriptions).toResponse();
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return ApiResponse.error("Failed to fetch subscriptions", 500).toResponse();
  }
});

export const DELETE = withProtectedRoute(async (request: NextRequest) => {
  try {
    const body: SubscriptionDeleteRequest = await request.json();
    const { id } = body;
    const authenticatedUserId = request.user!.id;

    if (!id) {
      return ApiResponse.error("Subscription ID is required", 400).toResponse();
    }

    const deletedSubscription = await prisma.subscription.update({
      where: { id, userId: authenticatedUserId },
      data: {
        deletedAt: new Date(),
      },
    });

    if (!deletedSubscription) {
      return ApiResponse.error(
        "Subscription not found or unauthorized",
        404,
      ).toResponse();
    }

    return ApiResponse.success(deletedSubscription).toResponse();
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return ApiResponse.error("Failed to delete subscription", 500).toResponse();
  }
});
