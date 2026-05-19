import { NextRequest } from "next/server";
import prisma, { rawPrisma } from "@/backend/lib/prisma";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import type { UserPutRequest } from "@/shared/types/api/apiRequest";

export const GET = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
    });

    if (!user) {
      return ApiResponse.error("User not found", 404).toResponse();
    }

    return ApiResponse.success(user).toResponse();
  } catch (error) {
    console.error("Error fetching user:", error);
    return ApiResponse.error("Failed to fetch user", 500).toResponse();
  }
});

export const PUT = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const body: UserPutRequest = await request.json();

    if (
      body.name === undefined &&
      body.image === undefined &&
      body.isOnboarded === undefined
    ) {
      return ApiResponse.error("No fields to update", 400).toResponse();
    }

    const updateData: { name?: string; image?: string | null; isOnboarded?: boolean } = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.isOnboarded !== undefined) updateData.isOnboarded = body.isOnboarded;

    const updatedUser = await prisma.user.update({
      where: { id: authenticatedUserId },
      data: updateData,
    });

    return ApiResponse.success(
      updatedUser,
      "User updated successfully",
    ).toResponse();
  } catch (error) {
    console.error("Error updating user:", error);
    return ApiResponse.error("Failed to update user", 500).toResponse();
  }
});

export const DELETE = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const deletedAt = new Date();

    await rawPrisma.$transaction(async (tx) => {
      await Promise.all([
        tx.analysis.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt, result: {}, error: null },
        }),
        tx.message.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt, content: "" },
        }),
        tx.file.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt },
        }),
        tx.chat.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt },
        }),
        tx.userCredit.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt, amount: 0, minimumBalance: 0 },
        }),
        tx.subscription.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt, isActive: false },
        }),
        tx.order.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt },
        }),
        tx.userSession.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt },
        }),
        tx.userDevice.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt },
        }),
        tx.revenueCatPurchase.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt, rawPayload: {} },
        }),
      ]);

      await tx.user.update({
        where: { id: authenticatedUserId },
        data: {
          name: "Deleted User",
          email: `deleted-${authenticatedUserId}@deleted.chatlyzer.local`,
          image: null,
          googleId: null,
          polarCustomerId: null,
          isActive: false,
          tokenVersion: { increment: 1 },
          deletedAt,
        },
      });
    });

    return ApiResponse.success({
      message: "User deleted successfully",
    }).toResponse();
  } catch (error) {
    console.error("Error deleting user:", error);
    return ApiResponse.error("Failed to delete user", 500).toResponse();
  }
});
