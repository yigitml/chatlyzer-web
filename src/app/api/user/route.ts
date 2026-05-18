import { NextRequest } from "next/server";
import prisma from "@/backend/lib/prisma";
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

    await prisma.$transaction(async (tx) => {
      await tx.analysis.updateMany({
        where: { userId: authenticatedUserId, deletedAt: null },
        data: { deletedAt },
      });
      await tx.message.updateMany({
        where: { userId: authenticatedUserId, deletedAt: null },
        data: { deletedAt },
      });
      await tx.file.updateMany({
        where: { userId: authenticatedUserId, deletedAt: null },
        data: { deletedAt },
      });
      await tx.chat.updateMany({
        where: { userId: authenticatedUserId, deletedAt: null },
        data: { deletedAt },
      });
      await tx.userCredit.updateMany({
        where: { userId: authenticatedUserId, deletedAt: null },
        data: { deletedAt, amount: 0 },
      });
      await tx.subscription.updateMany({
        where: { userId: authenticatedUserId, deletedAt: null },
        data: { deletedAt, isActive: false },
      });
      await tx.order.updateMany({
        where: { userId: authenticatedUserId, deletedAt: null },
        data: { deletedAt },
      });
      await tx.userSession.updateMany({
        where: { userId: authenticatedUserId, deletedAt: null },
        data: { deletedAt },
      });
      await tx.userDevice.updateMany({
        where: { userId: authenticatedUserId, deletedAt: null },
        data: { deletedAt },
      });
      await tx.user.update({
        where: { id: authenticatedUserId },
        data: {
          deletedAt,
          isActive: false,
          tokenVersion: { increment: 1 },
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
