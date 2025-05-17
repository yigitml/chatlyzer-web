import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/middleware/jwtAuth";
import { ApiResponse } from "@/types/api/apiResponse";
import prisma from "@/lib/prisma";
import type {
  AnalyticsResultPostRequest,
  AnalyticsResultPutRequest,
  AnalyticsResultDeleteRequest,
} from "@/types/api/apiRequest";
import { analyzeChat } from "@/lib/openai";

export const GET = withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const chatId = searchParams.get("chatId");
    const authenticatedUserId = request.user!.id;

    if (!id) {
      const analyticsResult = await prisma.analyticsResult.findFirst({
        where: {
          userId: authenticatedUserId,
        },
      });
      if (analyticsResult) {
        return ApiResponse.success(analyticsResult).toResponse();
      }
      return ApiResponse.error("analyticsResult not found").toResponse();
    } else if (chatId) {
      const analyticsResults = await prisma.analyticsResult.findMany({
        where: {
          userId: authenticatedUserId,
          chatId,
        },
      });
      return ApiResponse.success(analyticsResults).toResponse();
    } else {
      const analyticsResults = await prisma.analyticsResult.findMany({
        where: {
          userId: authenticatedUserId,
        },
      });
      return ApiResponse.success(analyticsResults).toResponse();
    }
  } catch (error) {
   console.error(error);
   return ApiResponse.error("Internal server error").toResponse();
  }
});

export const POST = withProtectedRoute(async (request: NextRequest) => {
  try {
   const authenticatedUserId = request.user!.id;
   const data: AnalyticsResultPostRequest = await request.json();


   const existinganalyticsResult = await prisma.analyticsResult.findFirst({
    where: {
      chatId: data.chatId,
    }
   });
    
   if (existinganalyticsResult) {
    return ApiResponse.error("analyticsResult already exists").toResponse();
   }

   const stats = await analyzeChat(data.chatId);

   const analyticsResult = await prisma.analyticsResult.create({
    data: {
      chatId: data.chatId,
      userId: authenticatedUserId,
      result: stats,
    }
   });

   return ApiResponse.success(
    analyticsResult,
    "analyticsResult created successfully!",
    200
   ).toResponse();

  } catch (error) {
    console.error("Error proccessing POST /api/analyticsResult");
    return ApiResponse.error(`Failed to process request`, 500).toResponse();
  }
});

export const PUT = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const data: AnalyticsResultPutRequest = await request.json();
    const { id, result } = data;

    if (!id) {
      return ApiResponse.error("analyticsResult ID is required").toResponse();
    }

    const updatedanalyticsResult = await prisma.analyticsResult.update({
      where: {
        id,
        userId: authenticatedUserId,
      },
      data: {
        result: data.result,
      },
    });

    if (!updatedanalyticsResult) {
      return ApiResponse.error("analyticsResult not found").toResponse();
    }

    return ApiResponse.success(
      updatedanalyticsResult,
      "analyticsResult updated successfully!",
      200
    ).toResponse();
  } catch (error) {
    console.error("Error proccessing PUT /api/analyticsResult");
    return ApiResponse.error(`Failed to process request`, 500).toResponse();
  }
});

export const DELETE = withProtectedRoute(async (request: NextRequest) => {
    try {
      const authenticatedUserId = request.user!.id;
      const data: AnalyticsResultDeleteRequest = await request.json();
      const { id } = data;

      if (!id) {
        return ApiResponse.error("analyticsResult ID is required").toResponse();
      }

      const deletedanalyticsResult = await prisma.analyticsResult.update({
        where: {
          id,
          userId: authenticatedUserId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      if (!deletedanalyticsResult) {
        return ApiResponse.error("analyticsResult not found", 404).toResponse();
      }

      return ApiResponse.success(
        deletedanalyticsResult,
        "analyticsResult deleted successfully!",
        200
      ).toResponse();
  } catch (error) {
    console.error("Error proccessing DELETE /api/analyticsResult");
    return ApiResponse.error(`Failed to process request`, 500).toResponse();
  }
});