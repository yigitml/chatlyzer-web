import { NextRequest } from "next/server";
import prisma, { rawPrisma } from "@/backend/lib/prisma";
import { apiErrorResponse, readJson } from "@/backend/lib/apiBoundary";
import { lockActiveAccount } from "@/backend/lib/accountLock";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { MessagePostRequest, MessagePutRequest } from "@/shared/types/api/apiRequest";
import {
  getValidationMessage,
  idBodySchema,
  messagePostSchema,
  messagePutSchema,
} from "@/shared/types/api/requestSchemas";
import { getPagination, paginateResults, paginationHeaders } from "@/shared/utils/pagination";

export const GET = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const chatId = searchParams.get("chatId");
    const authenticatedUserId = request.user!.id;

    if (id) {
      const message = await prisma.message.findFirst({
        where: { 
          id: id,
          userId: authenticatedUserId,
          deletedAt: null,
          chat: {
            userId: authenticatedUserId,
            deletedAt: null,
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
          userId: authenticatedUserId,
          deletedAt: null
        }
      });

      if (!chat) {
        return ApiResponse.error("Chat not found or unauthorized", 404).toResponse();
      }

      const pagination = getPagination(searchParams);
      const messages = await prisma.message.findMany({
        where: { 
          chatId,
          userId: authenticatedUserId,
          deletedAt: null
        },
        orderBy: [{ timestamp: "asc" }, { id: "asc" }],
        take: pagination.take,
        ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      });
      
      const page = paginateResults(messages, pagination.limit);
      return ApiResponse.success(page.items).toResponse(paginationHeaders(page.pageInfo));
    } else {
      return ApiResponse.error("Either message ID or chat ID is required", 400).toResponse();
    }
  } catch (error) {
    return apiErrorResponse(error, "Internal server error");
  }
}));

export const POST = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const parsed = messagePostSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return ApiResponse.error(getValidationMessage(parsed.error), 400).toResponse();
    }
    const data: MessagePostRequest = parsed.data;
    
    return await rawPrisma.$transaction(async tx => {
    await lockActiveAccount(tx, authenticatedUserId, request.user!.tokenVersion);
    const chat = await tx.chat.findFirst({
      where: {
        id: data.chatId,
        userId: authenticatedUserId,
        deletedAt: null,
      }
    });

    if (!chat) {
      return ApiResponse.error("Chat not found or unauthorized", 404).toResponse();
    }

    const message = await tx.message.create({
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
    });
  } catch (error) {
    return apiErrorResponse(error, "Internal server error");
  }
}));

export const PUT = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const parsed = messagePutSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return ApiResponse.error(getValidationMessage(parsed.error), 400).toResponse();
    }
    const data: MessagePutRequest = parsed.data;
    const { id, content, metadata } = data;

    return await rawPrisma.$transaction(async tx => {
    await lockActiveAccount(tx, authenticatedUserId, request.user!.tokenVersion);
    const message = await tx.message.findFirst({
      where: { id, deletedAt: null },
      include: { chat: true }
    });

    if (!message) {
      return ApiResponse.error("Message not found", 404).toResponse();
    }

    if (message.chat.userId !== authenticatedUserId || message.chat.deletedAt) {
      return ApiResponse.error("Unauthorized to modify this message", 403).toResponse();
    }

    const updatedMessage = await tx.message.update({
      where: { id },
      data: {
        ...(content !== undefined ? { content } : {}),
        metadata: metadata || message.metadata,
      }
    });

    return ApiResponse.success(updatedMessage, "Message updated successfully", 200).toResponse();
    });
  } catch (error) {
    return apiErrorResponse(error, "Internal server error");
  }
}));

export const DELETE = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const parsed = idBodySchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return ApiResponse.error(getValidationMessage(parsed.error), 400).toResponse();
    }
    const { id } = parsed.data;

    return await rawPrisma.$transaction(async tx => {
    await lockActiveAccount(tx, authenticatedUserId, request.user!.tokenVersion);
    const message = await tx.message.findFirst({
      where: { id, deletedAt: null },
      include: { chat: true }
    });

    if (!message) {
      return ApiResponse.error("Message not found", 404).toResponse();
    }

    if (message.chat.userId !== authenticatedUserId || message.chat.deletedAt) {
      return ApiResponse.error("Unauthorized to delete this message", 403).toResponse();
    }

    const deletedMessage = await tx.message.update({
      where: { id },
      data: {
        deletedAt: new Date(), content: "", sender: "", metadata: {}, timestamp: new Date(0),
      },
    });

    return ApiResponse.success(deletedMessage, "Message deleted successfully", 200).toResponse();
    });
  } catch (error) {
    return apiErrorResponse(error, "Internal server error");
  }
}));
