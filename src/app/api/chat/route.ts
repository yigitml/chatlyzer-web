import { NextRequest } from "next/server";
import prisma from "@/backend/lib/prisma";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { ChatPutRequest, ChatDeleteRequest } from "@/shared/types/api/apiRequest";
import { Prisma } from "../../../generated/client/client";
import { smartChatSampler } from "@/backend/lib/openai";
import {
  chatPostSchema,
  chatPutSchema,
  getValidationMessage,
  idBodySchema,
} from "@/shared/types/api/requestSchemas";

export const GET = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
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
          });
          return ApiResponse.success(chats).toResponse();
        }
    } catch (error) {
      console.error("Error fetching chats:", error);
      return ApiResponse.error("Internal server error", 500).toResponse();
    }
}));

export const POST = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const parsed = chatPostSchema.safeParse(await request.json());
    if (!parsed.success) {
      return ApiResponse.error(getValidationMessage(parsed.error), 400).toResponse();
    }
    const data = parsed.data;

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

    const validMessages = data.messages;

    let sampledMessages = [];

    if (validMessages.length > 0) {
      // Use smartChatSampler to ensure we don't store excessively large chats
      // We use a slightly higher limit for storage (200k tokens) to preserve more history than analysis
      sampledMessages = smartChatSampler(validMessages, 200000);
    } else {
      sampledMessages = validMessages;
    }
    
    const participants = sampledMessages ? [...new Set(sampledMessages.map(message => message.sender))] : [];

    const chat = await prisma.chat.create({
      data: {
        title: data.title,
        participants: participants,
        userId: authenticatedUserId,
      }
    });

    if (sampledMessages && sampledMessages.length > 0) {
      const messagesToCreate = sampledMessages
        .map(message => ({
          userId: authenticatedUserId,
          chatId: chat.id,
          sender: message.sender,
          content: message.content,
          timestamp: message.timestamp,
          metadata: message.metadata as Prisma.InputJsonValue,
        }));

      if (messagesToCreate.length > 0) {
        await prisma.message.createMany({
          data: messagesToCreate,
        });
      }
    } else {
      return ApiResponse.error("Chat must contain at least one valid message", 400).toResponse();
    }

    return ApiResponse.success(chat, "Chat created successfully", 200).toResponse();
  } catch (error) {
    console.error("Error creating chat:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
}));

export const PUT = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const parsed = chatPutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return ApiResponse.error(getValidationMessage(parsed.error), 400).toResponse();
    }
    const data: ChatPutRequest = parsed.data;

    const updatedModel = await prisma.chat.update({
      where: { id: data.id, userId: authenticatedUserId, deletedAt: null },
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
}));

export const DELETE = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const parsed = idBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return ApiResponse.error(getValidationMessage(parsed.error), 400).toResponse();
    }
    const { id }: ChatDeleteRequest = parsed.data;

    // Use a transaction to ensure both chat and analyses are deleted together
    const result = await prisma.$transaction(async (tx) => {
      // First, soft-delete the chat
      const deletedChat = await tx.chat.update({
        where: { id, userId: authenticatedUserId, deletedAt: null },
        data: {
          deletedAt: new Date(),
        },
      });

      // Then, soft-delete all analyses associated with this chat
      await tx.analysis.updateMany({
        where: {
          chatId: id,
          userId: authenticatedUserId,
          deletedAt: null, // Only delete analyses that aren't already deleted
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return deletedChat;
    });

    return ApiResponse.success(result, "Chat and associated analyses deleted successfully", 200).toResponse();
  } catch (error) {
    console.error("Error deleting chat:", error);
    return ApiResponse.error("Internal server error", 500).toResponse();
  }
}));
