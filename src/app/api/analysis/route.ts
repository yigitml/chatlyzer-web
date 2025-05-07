import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/middleware/jwtAuth";
import { ApiResponse } from "@/types/api/apiResponse";
import prisma from "@/lib/prisma";
import type {
  AnalysisPostRequest,
  AnalysisPutRequest,
  AnalysisDeleteRequest,
} from "@/types/api/apiRequest";

export const GET = withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const authenticatedUserId= request.user!.id;

    if (!id) {
      const analysis = await prisma.analysis.findFirst({
        where: {
          userId: authenticatedUserId,
        },
      });
      if (analysis) {
        return ApiResponse.success(analysis).toResponse();
      }
      return ApiResponse.error("Analysis not found").toResponse();
    } else {
      const analyzes = await prisma.analysis.findMany({
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
   const data: AnalysisPostRequest = await request.json();


   const existingAnalysis = await prisma.analysis.findFirst({
    where: {
      chatId: data.chatId,
      type: data.type,
    }
   });
    
   if (existingAnalysis) {
    return ApiResponse.error("Analysis already exists").toResponse();
   }

   const analysis = await prisma.analysis.create({
    data: {
      chatId: data.chatId,
      type: data.type,
      userId: authenticatedUserId,
      results: [],
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
    const data: AnalysisPutRequest = await request.json();
    const { id, type } = data;

    if (!id) {
      return ApiResponse.error("Analysis ID is required").toResponse();
    }

    const updatedAnalysis = await prisma.analysis.update({
      where: {
        id,
        userId: authenticatedUserId,
      },
      data: {
        type: type,
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
      const data: AnalysisDeleteRequest = await request.json();
      const { id } = data;

      if (!id) {
        return ApiResponse.error("Analysis ID is required").toResponse();
      }

      const deletedAnalysis = await prisma.analysis.update({
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