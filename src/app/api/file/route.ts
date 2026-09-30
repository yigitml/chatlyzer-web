import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";
//import { uploadFile } from "@/lib/fal";
import prisma, { rawPrisma } from "@/backend/lib/prisma";
import { ApiError, apiErrorResponse, readJson } from "@/backend/lib/apiBoundary";
import { lockActiveAccount } from "@/backend/lib/accountLock";
import { idBodySchema, getValidationMessage } from "@/shared/types/api/requestSchemas";
import { getPagination, paginateResults, paginationHeaders } from "@/shared/utils/pagination";

export const GET = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const chatId = searchParams.get("chatId");

    if (id) {
      const file = await prisma.file.findUnique({
        where: {
          id: id,
          userId: authenticatedUserId,
          deletedAt: null,
          OR: [{ chatId: null }, { chat: { deletedAt: null, userId: authenticatedUserId } }],
        },
      });

      if (!file) throw new ApiError("File not found", 404);
      return ApiResponse.success(file).toResponse();
    } else if (chatId) {
      const pagination = getPagination(searchParams);
      const files = await prisma.file.findMany({
        where: {
          userId: authenticatedUserId,
          chatId: chatId,
          deletedAt: null,
          OR: [{ chatId: null }, { chat: { deletedAt: null, userId: authenticatedUserId } }],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: pagination.take,
        ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      });

      const page = paginateResults(files, pagination.limit);
      return ApiResponse.success(page.items).toResponse(paginationHeaders(page.pageInfo));
    } else {
      const pagination = getPagination(searchParams);
      const files = await prisma.file.findMany({
        where: {
          userId: authenticatedUserId,
          deletedAt: null,
          OR: [{ chatId: null }, { chat: { deletedAt: null, userId: authenticatedUserId } }],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: pagination.take,
        ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      });

      const page = paginateResults(files, pagination.limit);
      return ApiResponse.success(page.items).toResponse(paginationHeaders(page.pageInfo));
    }
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch files");
  }
}));

export const POST = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return ApiResponse.error(
        `Invalid content type: ${contentType}. Must be multipart/form-data`,
        400,
      ).toResponse();
    }

    return ApiResponse.error(
      "File uploads are not available in this release",
      501,
    ).toResponse();
  } catch (error) {
    return apiErrorResponse(error, "Failed to upload file");
  }
}));

export const DELETE = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const parsed = idBodySchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(getValidationMessage(parsed.error), 400);
    const { id } = parsed.data;

    return await rawPrisma.$transaction(async tx => {
    await lockActiveAccount(tx, authenticatedUserId, request.user!.tokenVersion);
    const file = await tx.file.findFirst({
      where: {
        id: id,
        userId: authenticatedUserId,
        deletedAt: null,
      }
    });

    if (!file) {
      return ApiResponse.error("File not found or unauthorized", 404).toResponse();
    }

    const deletedFile = await tx.file.update({
      where: {
        id: id,
      },
      data: {
        deletedAt: new Date(), url: "", size: 0
      }
    });

    return ApiResponse.success(
      deletedFile, 
      "File deleted successfully", 
      200
    ).toResponse();
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete file");
  }
}));
