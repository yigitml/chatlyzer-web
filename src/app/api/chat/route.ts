import { NextRequest } from "next/server";
import prisma, { rawPrisma } from "@/backend/lib/prisma";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { Prisma } from "@/generated/client";
import { chatPostSchema, chatPutSchema, getValidationMessage, idBodySchema } from "@/shared/types/api/requestSchemas";
import { getPagination, paginateResults, paginationHeaders } from "@/shared/utils/pagination";
import { ApiError, apiErrorResponse, readJson } from "@/backend/lib/apiBoundary";
import { cancelChatJobs } from "@/backend/lib/analysisJobs";
import { lockActiveAccount } from "@/backend/lib/accountLock";

export const GET = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = request.user!.id;
    if (id) {
      const chat = await prisma.chat.findFirst({ where: { id, userId, deletedAt: null } });
      if (!chat) throw new ApiError("Chat not found", 404);
      return ApiResponse.success(chat).toResponse();
    }
    const pagination = getPagination(searchParams);
    const chats = await prisma.chat.findMany({ where: { userId, deletedAt: null }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: pagination.take, ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}) });
    const page = paginateResults(chats, pagination.limit);
    return ApiResponse.success(page.items).toResponse(paginationHeaders(page.pageInfo));
  } catch (error) { return apiErrorResponse(error); }
}));

export const POST = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const parsed = chatPostSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(getValidationMessage(parsed.error), 400);
    const { title, messages } = parsed.data;
    // Equal titles are allowed: they do not identify an import. A failed import
    // rolls back fully and can be retried with no title collision or residue.
    const chat = await rawPrisma.$transaction(async tx => {
      await lockActiveAccount(tx, request.user!.id, request.user!.tokenVersion);
      const chat = await tx.chat.create({ data: { title, userId: request.user!.id, participants: [...new Set(messages.map(message => message.sender))] } });
      await tx.message.createMany({ data: messages.map(message => ({ userId: request.user!.id, chatId: chat.id,
        sender: message.sender, content: message.content, timestamp: message.timestamp, metadata: (message.metadata || {}) as Prisma.InputJsonValue })) });
      return chat;
    });
    return ApiResponse.success(chat, "Chat created successfully").toResponse();
  } catch (error) { return apiErrorResponse(error); }
}));

export const PUT = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const parsed = chatPutSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(getValidationMessage(parsed.error), 400);
    const chat = await rawPrisma.$transaction(async tx => {
      await lockActiveAccount(tx, request.user!.id, request.user!.tokenVersion);
      return tx.chat.update({ where: { id: parsed.data.id, userId: request.user!.id, deletedAt: null }, data: { title: parsed.data.title } });
    });
    return ApiResponse.success(chat, "Chat updated successfully").toResponse();
  } catch (error) { return apiErrorResponse(error); }
}));

export const DELETE = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const parsed = idBodySchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(getValidationMessage(parsed.error), 400);
    const userId = request.user!.id;
    const id = parsed.data.id;
    const deletedAt = new Date();
    const chat = await rawPrisma.$transaction(async tx => {
      await lockActiveAccount(tx, userId, request.user!.tokenVersion);
      const chat = await tx.chat.update({ where: { id, userId, deletedAt: null }, data: { deletedAt, title: null, participants: [] } });
      await tx.analysis.updateMany({ where: { chatId: id, userId }, data: { deletedAt, result: Prisma.DbNull, error: null } });
      await tx.message.updateMany({ where: { chatId: id, userId }, data: { deletedAt, content: "", sender: "", metadata: {}, timestamp: new Date(0) } });
      await tx.file.updateMany({ where: { chatId: id, userId }, data: { deletedAt, url: "", size: 0 } });
      await cancelChatJobs(tx, userId, id);
      return chat;
    });
    return ApiResponse.success(chat, "Chat and associated content deleted successfully").toResponse();
  } catch (error) { return apiErrorResponse(error); }
}));
