import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withProtectedRoute } from "@/middleware/jwtAuth";
import { ApiResponse } from "@/types/api/apiResponse";
import { ChatPostRequest, ChatPutRequest } from "@/types/api/apiRequest";

export const GET = withProtectedRoute(async (request: NextRequest) => {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const authenticatedUserId = request.user!.id;

        if (id) {
          const chat = await prisma.chat.findFirst({
              where: { id, userId: authenticatedUserId },
          });
          if (chat) {
            return ApiResponse.success(chat).toResponse();
          }
          return ApiResponse.error("Model not found", 404).toResponse();
        } else {
          const chats = await prisma.chat.findMany({
            where: { userId: authenticatedUserId },
            orderBy: { createdAt: "desc" },
          });
          return ApiResponse.success(chats).toResponse();
        }
    } catch (error) {
      console.error("Error fetching chats:", error);
      return ApiResponse.error("Internal server error", 500).toResponse();
    }
});

export const POST = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const data: ChatPostRequest = await request.json();
    
    const existingChat = await prisma.chat.findFirst({
      where: {
        name: data.name,
        userId: authenticatedUserId,
      }
    });

    if (existingChat) {
      return ApiResponse.error("Chat already exists", 400).toResponse();
    }

    const chat = await prisma.chat.create({
      data: {
        name: data.name,
        source: data.source,
        userId: authenticatedUserId,
        description: data.description || "",
      }
    });
    
    return ApiResponse.success(chat, "Chat created successfully", 200).toResponse();
  } catch (error) {
    console.error("Error creating chat:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
});

export const PUT = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const data: ChatPutRequest = await request.json();
    const { id, name, description } = data;
    
    if (!id) {
      return ApiResponse.error("Chat ID is required", 400).toResponse();
    }

    const updatedModel = await prisma.chat.update({
      where: { id, userId: authenticatedUserId },
      data: {
        name,
        description,
      }
    });

    if (updatedModel) {
      return ApiResponse.success(updatedModel, "Chat updated successfully", 200).toResponse();
    }

    return ApiResponse.error("Chat not found", 404).toResponse();
  } catch (error) {
    console.error("Error updating chat:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
});

export const DELETE = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const { id } = await request.json();

    if (!id) {
      return ApiResponse.error("Chat ID is required", 400).toResponse();
    }

    const deletedChat = await prisma.chat.update({
      where: { id, userId: authenticatedUserId },
      data: {
        deletedAt: new Date(),
      },
    });

    if (deletedChat) {
      return ApiResponse.success(deletedChat, "Chat deleted successfully", 200).toResponse();
    }

    return ApiResponse.error("Chat not found", 404).toResponse();
  } catch (error) {
    console.error("Error deleting chat:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
});