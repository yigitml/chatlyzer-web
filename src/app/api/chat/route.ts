import { NextRequest, NextResponse } from "next/server";
import prisma from "@/backend/lib/prisma";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { ChatPostRequest, ChatPutRequest, ChatDeleteRequest } from "@/shared/types/api/apiRequest";
import { InputJsonValue, JsonValue } from "@prisma/client/runtime/library";
import { smallChatBuilder } from "@/backend/lib/openai";

export const GET = withProtectedRoute(async (request: NextRequest) => {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const authenticatedUserId = request.user!.id;

        if (id) {
          const chat = await prisma.chat.findFirst({
              where: { id, userId: authenticatedUserId, deletedAt: null },
          });
          if (chat) {
            return ApiResponse.success(chat).toResponse();
          }
          return ApiResponse.error("Chat not found", 404).toResponse();
        } else {
          const chats = await prisma.chat.findMany({
            where: { userId: authenticatedUserId, deletedAt: null },
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
    
    if (!data.title || data.title.trim() === "") {
      return ApiResponse.error("Chat title is required", 400).toResponse();
    }

    const existingChat = await prisma.chat.findFirst({
      where: {
        title: data.title,
        userId: authenticatedUserId,
        deletedAt: null,
      }
    });

    if (existingChat) {
      return ApiResponse.error("Chat already exists", 400).toResponse();
    }

    const messages = data.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return ApiResponse.error("Messages are required", 400).toResponse();
    }

    const hasValidMessage = messages.some(msg => msg.content && msg.content.trim().length > 0);
    if (!hasValidMessage) {
      return ApiResponse.error("Chat must contain at least one message with content", 400).toResponse();
    }

    let sampledMessages = [];

    if (messages.length > 25000) {
      const interval = messages.length / 25000;
      for (let i = 0; i < 25000; i++) {
        sampledMessages.push(messages[Math.floor(i * interval)]);
      }
    } else sampledMessages = messages;
    
    const participants = sampledMessages ? [...new Set(sampledMessages.map(message => message.sender))] : [];

    const chat = await prisma.chat.create({
      data: {
        title: data.title,
        participants: participants,
        userId: authenticatedUserId,
      }
    });

    if (sampledMessages) {
      sampledMessages.forEach(async (message) => {
        if (message.content.length < 500) {
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
        }
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