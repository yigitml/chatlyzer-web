import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";
//import { uploadFile } from "@/lib/fal";
import prisma from "@/backend/lib/prisma";
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
        },
      });

      return ApiResponse.success(file).toResponse();
    } else if (chatId) {
      const pagination = getPagination(searchParams);
      const files = await prisma.file.findMany({
        where: {
          userId: authenticatedUserId,
          chatId: chatId,
          deletedAt: null
        },
        orderBy: {
          createdAt: "desc",
        },
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
          deletedAt: null
        },
        orderBy: {
          createdAt: "desc",
        },
        take: pagination.take,
        ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      });

      const page = paginateResults(files, pagination.limit);
      return ApiResponse.success(page.items).toResponse(paginationHeaders(page.pageInfo));
    }
  } catch (error) {
    console.error("Error fetching files:", error);
    return ApiResponse.error("Failed to fetch files", 500).toResponse();
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
    console.error("Error uploading file:", error);
    return ApiResponse.error("Failed to upload file", 500).toResponse();
  }
}));

export const DELETE = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const { id } = await request.json();

    if (!id) {
      return ApiResponse.error("File ID is required", 400).toResponse();
    }

    const file = await prisma.file.findFirst({
      where: {
        id: id,
        userId: authenticatedUserId,
        deletedAt: null,
      }
    });

    if (!file) {
      return ApiResponse.error("File not found or unauthorized", 404).toResponse();
    }

    const deletedFile = await prisma.file.update({
      where: {
        id: id,
      },
      data: {
        deletedAt: new Date()
      }
    });

    return ApiResponse.success(
      deletedFile, 
      "File deleted successfully", 
      200
    ).toResponse();
  } catch (error) {
    console.error("Error deleting file:", error);
    return ApiResponse.error("Failed to delete file", 500).toResponse();
  }
}));
