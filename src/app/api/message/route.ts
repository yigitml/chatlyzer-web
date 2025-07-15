import { NextRequest } from "next/server";
import prisma from "@/backend/lib/prisma";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { MessagePostRequest, MessagePutRequest } from "@/shared/types/api/apiRequest";

export const GET = withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const chatId = searchParams.get("chatId");
    const authenticatedUserId = request.user!.id;

    if (id) {
      const message = await prisma.message.findFirst({
        where: { 
          id: id,
          chat: {
            userId: authenticatedUserId
          }
        }
      });
      
      if (message) {
        return ApiResponse.success(message).toResponse();
      }
      return ApiResponse.error("Message not found", 404).toResponse();
    } else if (chatId) {
      const chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          userId: authenticatedUserId
        }
      });

      if (!chat) {
        return ApiResponse.error("Chat not found or unauthorized", 404).toResponse();
      }

      const messages = await prisma.message.findMany({
        where: { 
          chatId,
          deletedAt: null
        },
        orderBy: { timestamp: "asc" }
      });
      
      return ApiResponse.success(messages).toResponse();
    } else {
      return ApiResponse.error("Either message ID or chat ID is required", 400).toResponse();
    }
  } catch (error) {
    console.error("Error fetching messages:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
});

export const POST = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const data: MessagePostRequest = await request.json();
    
    const chat = await prisma.chat.findFirst({
      where: {
        id: data.chatId,
        userId: authenticatedUserId
      }
    });

    if (!chat) {
      return ApiResponse.error("Chat not found or unauthorized", 404).toResponse();
    }

    const message = await prisma.message.create({
      data: {
        userId: authenticatedUserId,
        content: data.content,
        timestamp: data.timestamp || new Date(),
        sender: data.sender,
        chatId: data.chatId,
        metadata: data.metadata || {}
      }
    });
    
    return ApiResponse.success(message, "Message created successfully", 201).toResponse();
  } catch (error) {
    console.error("Error creating message:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
});

export const PUT = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const data: MessagePutRequest = await request.json();
    const { id, content, metadata } = data;
    
    if (!id) {
      return ApiResponse.error("Message ID is required", 400).toResponse();
    }

    const message = await prisma.message.findFirst({
      where: { id },
      include: { chat: true }
    });

    if (!message) {
      return ApiResponse.error("Message not found", 404).toResponse();
    }

    if (message.chat.userId !== authenticatedUserId) {
      return ApiResponse.error("Unauthorized to modify this message", 403).toResponse();
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        content,
        metadata: metadata || message.metadata,
      }
    });

    return ApiResponse.success(updatedMessage, "Message updated successfully", 200).toResponse();
  } catch (error) {
    console.error("Error updating message:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
});

export const DELETE = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const { id } = await request.json();

    if (!id) {
      return ApiResponse.error("Message ID is required", 400).toResponse();
    }

    const message = await prisma.message.findFirst({
      where: { id },
      include: { chat: true }
    });

    if (!message) {
      return ApiResponse.error("Message not found", 404).toResponse();
    }

    if (message.chat.userId !== authenticatedUserId) {
      return ApiResponse.error("Unauthorized to delete this message", 403).toResponse();
    }

    const deletedMessage = await prisma.message.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return ApiResponse.success(deletedMessage, "Message deleted successfully", 200).toResponse();
  } catch (error) {
    console.error("Error deleting message:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
});
