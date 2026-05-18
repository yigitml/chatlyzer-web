import { NextRequest } from "next/server";
import prisma, { rawPrisma } from "@/backend/lib/prisma";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import type { UserPutRequest, UserPostRequest } from "@/shared/types/api/apiRequest";

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
      !body.name &&
      !body.image &&
      !body.isOnboarded &&
      !body.isTourCompleted &&
      !body.isFirstModelCreated
    ) {
      return ApiResponse.error("No fields to update", 400).toResponse();
    }

    const updateData: Partial<UserPutRequest> = {};
    if (body.name) updateData.name = body.name;
    if (body.image) updateData.image = body.image;
    if (body.isOnboarded) updateData.isOnboarded = body.isOnboarded;
    if (body.isTourCompleted) updateData.isTourCompleted = body.isTourCompleted;
    if (body.isFirstModelCreated)
      updateData.isFirstModelCreated = body.isFirstModelCreated;

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
        tx.userSession.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt },
        }),
        tx.userDevice.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt },
        }),
        tx.subscription.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt, isActive: false },
        }),
        tx.userCredit.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt, amount: 0, minimumBalance: 0 },
        }),
        tx.file.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt },
        }),
        tx.chat.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt },
        }),
        tx.message.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt, content: "" },
        }),
        tx.analysis.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt, result: null as any, error: null },
        }),
        tx.revenueCatPurchase.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt, rawPayload: null as any },
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
