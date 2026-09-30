import { apiErrorResponse, readJson } from "@/backend/lib/apiBoundary";
import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import prisma from "@/backend/lib/prisma";
import { idBodySchema, getValidationMessage } from "@/shared/types/api/requestSchemas";
import { lockActiveAccount } from "@/backend/lib/accountLock";
import { getPagination, paginateResults, paginationHeaders } from "@/shared/utils/pagination";

export const GET = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const authenticatedUserId = request.user!.id;

    if (id) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          id,
          userId: authenticatedUserId,
          deletedAt: null,
        },
      });

      if (!subscription) {
        return ApiResponse.error("Subscription not found", 404).toResponse();
      }

      return ApiResponse.success(subscription).toResponse();
    }

    const pagination = getPagination(searchParams);
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: authenticatedUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: pagination.take,
      ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
    });

    const page = paginateResults(subscriptions, pagination.limit);
    return ApiResponse.success(page.items).toResponse(paginationHeaders(page.pageInfo));
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch subscriptions");
  }
}));

export const DELETE = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const parsed = idBodySchema.safeParse(await readJson(request));
    if (!parsed.success) return ApiResponse.error(getValidationMessage(parsed.error), 400).toResponse();
    const { id } = parsed.data;
    const authenticatedUserId = request.user!.id;

    if (!id) {
      return ApiResponse.error("Subscription ID is required", 400).toResponse();
    }

    const deletedSubscription = await prisma.$transaction(async tx => {
      await lockActiveAccount(tx, authenticatedUserId, request.user!.tokenVersion);
      return tx.subscription.update({
      where: { id, userId: authenticatedUserId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
    });

    if (!deletedSubscription) {
      return ApiResponse.error(
        "Subscription not found or unauthorized",
        404,
      ).toResponse();
    }

    return ApiResponse.success(deletedSubscription).toResponse();
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete subscription");
  }
}));
