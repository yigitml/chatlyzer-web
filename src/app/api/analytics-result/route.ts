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
    const authenticatedUserId = request.user!.id;

    if (!id) {
      const analysis = await prisma.analyticsResult.findFirst({
        where: {
          userId: authenticatedUserId,
        },
      });
      if (analysis) {
        return ApiResponse.success(analysis).toResponse();
      }
      return ApiResponse.error("Analysis not found").toResponse();
    } else {
      const analyzes = await prisma.analyticsResult.findMany({
        where: {
          userId: authenticatedUserId,
        },
      });
      return ApiResponse.success(analyzes).toResponse();
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


   const existingAnalysis = await prisma.analyticsResult.findFirst({
    where: {
      chatId: data.chatId,
    }
   });
    
   if (existingAnalysis) {
    return ApiResponse.error("Analysis already exists").toResponse();
   }

   const stats = await analyzeChat(data.chatId);

   const analysis = await prisma.analyticsResult.create({
    data: {
      chatId: data.chatId,
      userId: authenticatedUserId,
      result: stats,
    }
   });

   return ApiResponse.success(
    analysis,
    "Analysis created successfully!",
    200
   ).toResponse();

  } catch (error) {
    console.error("Error proccessing POST /api/analysis");
    return ApiResponse.error(`Failed to process request`, 500).toResponse();
  }
});

export const PUT = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const data: AnalyticsResultPutRequest = await request.json();
    const { id, result } = data;

    if (!id) {
      return ApiResponse.error("Analysis ID is required").toResponse();
    }

    const updatedAnalysis = await prisma.analyticsResult.update({
      where: {
        id,
        userId: authenticatedUserId,
      },
      data: {
        result: data.result,
      },
    });

    if (!updatedAnalysis) {
      return ApiResponse.error("Analysis not found").toResponse();
    }

    return ApiResponse.success(
      updatedAnalysis,
      "Analysis updated successfully!",
      200
    ).toResponse();
  } catch (error) {
    console.error("Error proccessing PUT /api/analysis");
    return ApiResponse.error(`Failed to process request`, 500).toResponse();
  }
});

export const DELETE = withProtectedRoute(async (request: NextRequest) => {
    try {
      const authenticatedUserId = request.user!.id;
      const data: AnalyticsResultDeleteRequest = await request.json();
      const { id } = data;

      if (!id) {
        return ApiResponse.error("Analysis ID is required").toResponse();
      }

      const deletedAnalysis = await prisma.analyticsResult.update({
        where: {
          id,
          userId: authenticatedUserId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      if (!deletedAnalysis) {
        return ApiResponse.error("Analysis not found", 404).toResponse();
      }

      return ApiResponse.success(
        deletedAnalysis,
        "Analysis deleted successfully!",
        200
      ).toResponse();
  } catch (error) {
    console.error("Error proccessing DELETE /api/analysis");
    return ApiResponse.error(`Failed to process request`, 500).toResponse();
  }
});