import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/middleware/jwtAuth";
import { ApiResponse } from "@/types/api/apiResponse";
import prisma from "@/lib/prisma";
import type {
  PrivacyAnalysisPostRequest,
  AnalysisType,
  AnalysisPutRequest,
  AnalysisDeleteRequest,
} from "@/types/api/apiRequest";
import { analyzeAllChatTypesPrivate } from "@/lib/openai";
import { consumeUserCredits } from "@/utils/consumeUserCredits";
import { CreditType } from "@prisma/client";
import { 
  getAllAnalysisTypes, 
  analysisTypeToSchemaKey, 
  analysisTypeToTypeLiteral 
} from "@/types/analysis";

export const POST = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const data: PrivacyAnalysisPostRequest = await request.json();

    // Validate required fields
    if (!data.title || !data.messages || !Array.isArray(data.messages)) {
      return ApiResponse.error("Title and messages are required", 400).toResponse();
    }

    if (data.messages.length === 0) {
      return ApiResponse.error("At least one message is required", 400).toResponse();
    }

    // Consume 8 credits for comprehensive analysis
    const creditConsumption = await consumeUserCredits(authenticatedUserId, CreditType.ANALYSIS, 8);

    if (!creditConsumption) {
      return ApiResponse.error("Insufficient credits", 402).toResponse();
    }

    // Extract participants from messages for the chat record
    const participants = [...new Set(data.messages.map(message => message.sender))];

    // Create chat record WITHOUT storing messages, marked as privacy
    const chat = await prisma.chat.create({
      data: {
        title: data.title,
        participants: participants,
        userId: authenticatedUserId,
        isPrivacy: true, // Mark as privacy chat
      }
    });

    // Perform comprehensive analysis using messages from request
    const comprehensiveAnalysisData = await analyzeAllChatTypesPrivate(
      data.title,
      data.messages
    );

    // Get all analysis types using utility function
    const analysisTypes = getAllAnalysisTypes();

    // Create analysis records for each type
    const analysisPromises = analysisTypes.map(async (analysisType) => {
      const schemaKey = analysisTypeToSchemaKey(analysisType);
      const analysisResult = comprehensiveAnalysisData.analyses[schemaKey as keyof typeof comprehensiveAnalysisData.analyses];
      
      console.log(`Processing ${analysisType} (${schemaKey}):`, !!analysisResult);
      
      if (!analysisResult) {
        throw new Error(`Analysis result for ${analysisType} is missing or undefined`);
      }
      
      // Add the type field back to the analysis result
      const analysisWithType = {
        type: analysisTypeToTypeLiteral(analysisType),
        ...analysisResult
      };
      
      return prisma.analysis.create({
        data: {
          chatId: chat.id,
          userId: authenticatedUserId,
          result: analysisWithType,
        }
      });
    });

    const analyses = await Promise.all(analysisPromises);

    return ApiResponse.success(
      {
        chat: chat,
        analyses: analyses
      },
      "Privacy analysis completed successfully! Messages were analyzed but not stored.",
      200
    ).toResponse();

  } catch (error) {
    console.error("Error processing POST /api/privacy-analysis", error);
    return ApiResponse.error(`Failed to process privacy analysis request`, 500).toResponse();
  }
});