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
import { analyzeAllChatTypes } from "@/lib/openai";
import { consumeUserCredits } from "@/utils/consumeUserCredits";
import { CreditType } from "@prisma/client";

// Analysis type mapping for database storage
const ANALYSIS_TYPES: AnalysisType[] = [
  'ChatStats',
  'RedFlag', 
  'GreenFlag',
  'VibeCheck',
  'SimpOMeter',
  'GhostRisk',
  'MainCharacterEnergy',
  'EmotionalDepth'
];

// Mapping from analysis types to schema property names
const ANALYSIS_TYPE_TO_SCHEMA_KEY: Record<AnalysisType, string> = {
  'ChatStats': 'chatStats',
  'RedFlag': 'redFlag',
  'GreenFlag': 'greenFlag',
  'VibeCheck': 'vibeCheck',
  'SimpOMeter': 'simpOMeter',
  'GhostRisk': 'ghostRisk',
  'MainCharacterEnergy': 'mainCharacterEnergy',
  'EmotionalDepth': 'emotionalDepth'
};

// Mapping from analysis types to their type literals
const ANALYSIS_TYPE_TO_TYPE_LITERAL: Record<AnalysisType, string> = {
  'ChatStats': 'chat_stats',
  'RedFlag': 'red_flag',
  'GreenFlag': 'green_flag',
  'VibeCheck': 'vibe_check',
  'SimpOMeter': 'simp_o_meter',
  'GhostRisk': 'ghost_risk',
  'MainCharacterEnergy': 'main_character_energy',
  'EmotionalDepth': 'emotional_depth'
};

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

   // Check if analyses already exist for this chat
   const existingAnalyses = await prisma.analysis.findMany({
    where: {
      chatId: data.chatId,
      userId: authenticatedUserId,
    }
   });

   if (existingAnalyses.length > 0) {
    return ApiResponse.error("Analyses already exist for this chat").toResponse();
   }

   // Consume 8 credits for comprehensive analysis
   const creditConsumption = await consumeUserCredits(authenticatedUserId, CreditType.ANALYSIS, 8);

   if (!creditConsumption) {
    return ApiResponse.error("Insufficient credits").toResponse();
   }

   // Perform comprehensive analysis
   const comprehensiveAnalysisData = await analyzeAllChatTypes(data.chatId);

   // Create analysis records for each type
   const analysisPromises = ANALYSIS_TYPES.map(async (analysisType) => {
     const schemaKey = ANALYSIS_TYPE_TO_SCHEMA_KEY[analysisType];
     const analysisResult = comprehensiveAnalysisData.analyses[schemaKey as keyof typeof comprehensiveAnalysisData.analyses];
     
     console.log(`Processing ${analysisType} (${schemaKey}):`, !!analysisResult);
     
     if (!analysisResult) {
       throw new Error(`Analysis result for ${analysisType} is missing or undefined`);
     }
     
     // Add the type field back to the analysis result
     const analysisWithType = {
       type: ANALYSIS_TYPE_TO_TYPE_LITERAL[analysisType],
       ...analysisResult
     };
     
     return prisma.analysis.create({
       data: {
         chatId: data.chatId,
         userId: authenticatedUserId,
         result: analysisWithType,
       }
     });
   });

   const analyses = await Promise.all(analysisPromises);

   return ApiResponse.success(
    analyses,
    "Comprehensive analysis completed successfully!",
    200
   ).toResponse();

  } catch (error) {
    console.error("Error processing POST /api/analysis", error);
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
    console.error("Error processing PUT /api/analysis");
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
    console.error("Error processing DELETE /api/analysis");
    return ApiResponse.error(`Failed to process request`, 500).toResponse();
  }
});