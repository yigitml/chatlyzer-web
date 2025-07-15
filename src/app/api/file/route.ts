import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { ApiResponse } from "@/shared/types/api/apiResponse";
//import { uploadFile } from "@/lib/fal";
import prisma from "@/backend/lib/prisma";

export const GET = withProtectedRoute(async (request: NextRequest) => {
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
        },
      });

      return ApiResponse.success(file).toResponse();
    } else if (chatId) {
      const files = await prisma.file.findMany({
        where: {
          userId: authenticatedUserId,
          chatId: chatId,
          deletedAt: null
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return ApiResponse.success(files).toResponse();
    } else {
      const files = await prisma.file.findMany({
        where: {
          userId: authenticatedUserId,
          deletedAt: null
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return ApiResponse.success(files).toResponse();
    }
  } catch (error) {
    console.error("Error fetching files:", error);
    return ApiResponse.error("Failed to fetch files", 500).toResponse();
  }
});

export const POST = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const contentType = request.headers.get("content-type");

    if (!contentType?.includes("multipart/form-data")) {
      return ApiResponse.error(
        `Invalid content type: ${contentType}. Must be multipart/form-data`,
        400,
      ).toResponse();
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const chatId = formData.get("chatId") as string || null;

    if (!file) {
      return ApiResponse.error("File is required", 400).toResponse();
    }

    if (chatId) {
      const chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          userId: authenticatedUserId
        }
      });

      if (!chat) {
        return ApiResponse.error("Chat not found or unauthorized", 404).toResponse();
      }
    }

    // TODO
    // const url = await uploadFile(file);
    const url = "https://example.com/file.pdf";
    const newFile = await prisma.file.create({
      data: {
        url: url,
        size: file.size,
        userId: authenticatedUserId,
        chatId: chatId
      },
    });

    return ApiResponse.success(
      newFile,
      "File uploaded successfully",
      201,
    ).toResponse();
  } catch (error) {
    console.error("Error uploading file:", error);
    return ApiResponse.error("Failed to upload file", 500).toResponse();
  }
});

export const DELETE = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const { id } = await request.json();

    if (!id) {
      return ApiResponse.error("File ID is required", 400).toResponse();
    }

    const file = await prisma.file.findFirst({
      where: {
        id: id,
        userId: authenticatedUserId
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
});
