import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/middleware/jwtAuth";
import { ApiResponse } from "@/types/api/apiResponse";
import prisma from "@/lib/prisma";
import type {
  AnalysisPostRequest,
  AnalysisPutRequest,
  AnalysisDeleteRequest,
  AnalysisType,
} from "@/types/api/apiRequest";
import { analyzeChat } from "@/lib/openai";
import { ChatlyzerSchemas } from "@/schemas/zodSchemas";
import { consumeUserCredits } from "@/utils/consumeUserCredits";
import { CreditType } from "@prisma/client";

export const GET = withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const chatId = searchParams.get("chatId");
    const authenticatedUserId = request.user!.id;

    if (id) {
      const analysis = await prisma.analysis.findFirst({
        where: {
          id: id,
          userId: authenticatedUserId,
        },
      });
      if (analysis) {
        return ApiResponse.success(analysis).toResponse();
      }
      return ApiResponse.error("analysis not found").toResponse();
    } else if (chatId) {
      const analyzes = await prisma.analysis.findMany({
        where: {
          userId: authenticatedUserId,
          chatId,
        },
      });
      return ApiResponse.success(analyzes).toResponse();
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

   /*
   const existinganalysis = await prisma.analysis.findFirst({
    where: {
      chatId: data.chatId,
    }
   });

   if (existinganalysis) {
    return ApiResponse.error("Analysis already exists").toResponse();
   }
   */

   const creditConsumption = await consumeUserCredits(authenticatedUserId, CreditType.ANALYSIS, 1);

   if (!creditConsumption) {
    return ApiResponse.error("Insufficient credits").toResponse();
   }

   const selectedSchema = ChatlyzerSchemas[data.analysisType];
   if (!selectedSchema) {
     return ApiResponse.error("Invalid analysis type").toResponse();
   }

   const analysisData = await analyzeChat(data.chatId, selectedSchema);

   const analysis = await prisma.analysis.create({
    data: {
      chatId: data.chatId,
      userId: authenticatedUserId,
      result: analysisData,
    }
   });

   return ApiResponse.success(
    analysis,
    "analysis created successfully!",
    200
   ).toResponse();

  } catch (error) {
    console.error("Error proccessing POST /api/analysis", error);
    return ApiResponse.error(`Failed to process request`, 500).toResponse();
  }
});

export const PUT = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const data: AnalysisPutRequest = await request.json();
    const { id, result } = data;

    if (!id) {
      return ApiResponse.error("analysis ID is required").toResponse();
    }

    const updatedanalysis = await prisma.analysis.update({
      where: {
        id,
        userId: authenticatedUserId,
      },
      data: {
        result: result,
      },
    });

    if (!updatedanalysis) {
      return ApiResponse.error("analysis not found").toResponse();
    }

    return ApiResponse.success(
      updatedanalysis,
      "analysis updated successfully!",
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
        return ApiResponse.error("analysis ID is required").toResponse();
      }

      const deletedanalysis = await prisma.analysis.update({
        where: {
          id,
          userId: authenticatedUserId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      if (!deletedanalysis) {
        return ApiResponse.error("analysis not found", 404).toResponse();
      }

      return ApiResponse.success(
        deletedanalysis,
        "analysis deleted successfully!",
        200
      ).toResponse();
  } catch (error) {
    console.error("Error proccessing DELETE /api/analysis");
    return ApiResponse.error(`Failed to process request`, 500).toResponse();
  }
});