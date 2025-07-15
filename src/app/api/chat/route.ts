import { NextRequest, NextResponse } from "next/server";
import prisma from "@/backend/lib/prisma";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { ChatPostRequest, ChatPutRequest, ChatDeleteRequest } from "@/shared/types/api/apiRequest";
import { InputJsonValue, JsonValue } from "@prisma/client/runtime/library";

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
          return ApiResponse.error("Chat not found", 404).toResponse();
        } else {
          const chats = await prisma.chat.findMany({
            where: { userId: authenticatedUserId },
            orderBy: { createdAt: "desc" },
            include: {
              messages: {
                orderBy: {
                  timestamp: "asc",
                },
              },
            }
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
        title: data.title,
        userId: authenticatedUserId,
      }
    });

    if (existingChat) {
      return ApiResponse.error("Chat already exists", 400).toResponse();
    }

    const messages = data.messages
    const participants = messages ? [...new Set(messages.map(message => message.sender))] : [];

    const chat = await prisma.chat.create({
      data: {
        title: data.title,
        participants: participants,
        userId: authenticatedUserId,
      }
    });

    if (messages) {
      messages.forEach(async (message) => {
        await prisma.message.create({
          data: {
            userId: authenticatedUserId,
            chatId: chat.id,
            sender: message.sender,
            content: message.content,
            timestamp: message.timestamp,
            metadata: message.metadata as InputJsonValue,
          }
        })
      })
    } 

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
    
    if (!data.id) {
      return ApiResponse.error("Chat ID is required", 400).toResponse();
    }

    const updatedModel = await prisma.chat.update({
      where: { id: data.id, userId: authenticatedUserId },
      data: {
        title: data.title,
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
    const { id } : ChatDeleteRequest = await request.json();

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