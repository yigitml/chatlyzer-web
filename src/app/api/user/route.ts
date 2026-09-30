import { accessCookie, refreshCookie } from "@/backend/lib/authSession";
import { apiErrorResponse, readJson } from "@/backend/lib/apiBoundary";
import { lockActiveAccount } from "@/backend/lib/accountLock";
import { Prisma } from "@/generated/client";
import { NextRequest } from "next/server";
import prisma, { rawPrisma } from "@/backend/lib/prisma";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { getValidationMessage, userPutSchema } from "@/shared/types/api/requestSchemas";
import { publicUserSelect, toPublicUser } from "@/shared/types/api/publicDtos";

export const GET = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
      select: publicUserSelect,
    });

    if (!user) {
      return ApiResponse.error("User not found", 404).toResponse();
    }

    return ApiResponse.success(toPublicUser(user)).toResponse();
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch user");
  }
}));

export const PUT = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const parsed = userPutSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return ApiResponse.error(getValidationMessage(parsed.error), 400).toResponse();
    }
    const body = parsed.data;

    const updateData: { name?: string; image?: string | null; isOnboarded?: boolean } = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.isOnboarded !== undefined) updateData.isOnboarded = body.isOnboarded;

    const updatedUser = await rawPrisma.$transaction(async tx => {
      await lockActiveAccount(tx, authenticatedUserId, request.user!.tokenVersion);
      return tx.user.update({
      where: { id: authenticatedUserId },
      data: updateData,
      select: publicUserSelect,
      });
    });

    return ApiResponse.success(
      toPublicUser(updatedUser),
      "User updated successfully",
    ).toResponse();
  } catch (error) {
    return apiErrorResponse(error, "Failed to update user");
  }
}));

export const DELETE = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const deletedAt = new Date();

    await rawPrisma.$transaction(async (tx) => {
      await lockActiveAccount(tx, authenticatedUserId, request.user!.tokenVersion);
      await tx.analysisJob.updateMany({
        where: { userId: authenticatedUserId, status: "PROCESSING" },
        data: { status: "CANCELLED", error: "Account deleted", leaseExpiresAt: deletedAt },
      });
      await Promise.all([
        tx.analysis.updateMany({
          where: { userId: authenticatedUserId },
          data: { deletedAt, result: Prisma.DbNull, error: null },
        }),
        tx.message.updateMany({
          where: { userId: authenticatedUserId },
          data: { deletedAt, content: "", metadata: {}, sender: "", timestamp: new Date(0), createdAt: new Date(0), updatedAt: new Date(0) },
        }),
        tx.file.updateMany({
          where: { userId: authenticatedUserId },
          data: { deletedAt, url: "", size: 0 },
        }),
        tx.chat.updateMany({
          where: { userId: authenticatedUserId },
          data: { deletedAt, title: null, participants: [] },
        }),
        tx.userCredit.updateMany({
          where: { userId: authenticatedUserId },
          data: { deletedAt, amount: 0, minimumBalance: 0, totalAmount: 0, sandboxAmount: 0, sandboxTotalAmount: 0 },
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
          data: { deletedAt, loginGeneration: "revoked", refreshTokenVersion: { increment: 1 } },
        }),
        tx.userDevice.updateMany({
          where: { userId: authenticatedUserId, deletedAt: null },
          data: { deletedAt, loginGeneration: "revoked", refreshTokenVersion: { increment: 1 } },
        }),
        tx.revenueCatPurchase.updateMany({
          where: { userId: authenticatedUserId },
          data: { deletedAt, rawPayload: {} },
        }),
      ]);

      await tx.$executeRaw`UPDATE "UserSession" SET "sessionId" = "id", "lastActivityAt" = to_timestamp(0) WHERE "userId" = ${authenticatedUserId}`;
      await tx.$executeRaw`UPDATE "UserDevice" SET "deviceId" = "id", "lastLoginAt" = to_timestamp(0) WHERE "userId" = ${authenticatedUserId}`;
      await tx.user.update({
        where: { id: authenticatedUserId },
        data: {
          name: "Deleted User",
          email: `deleted-${authenticatedUserId}@deleted.chatlyzer.local`,
          image: null,
          googleId: null,
          polarCustomerId: null,
          lastLoginAt: null,
          isOnboarded: false,
          isActive: false,
          tokenVersion: { increment: 1 },
          deletedAt,
        },
      });
    });

    const response = ApiResponse.success({ message: "User deleted successfully" }).toResponse();
    response.headers.append("Set-Cookie", accessCookie("", 0));
    response.headers.append("Set-Cookie", refreshCookie("", false, 0));
    response.headers.append("Set-Cookie", refreshCookie("", true, 0));
    response.headers.append("Set-Cookie", `loginCsrf=; HttpOnly; Path=/api/auth/web; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}; SameSite=Strict`);
    return response;
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete user");
  }
}));
