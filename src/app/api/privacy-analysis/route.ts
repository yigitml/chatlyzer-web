import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import prisma from "@/backend/lib/prisma";
import type {
  PrivacyAnalysisPostRequest,
} from "@/shared/types/api/apiRequest";
import { analyzeAllChatTypesPrivate, smallChatBuilder } from "@/backend/lib/openai";
import { consumeUserCredits } from "@/backend/lib/consumeUserCredits";
import { CreditType, AnalysisStatus } from "@prisma/client";
import { 
  getAllAnalysisTypes, 
  analysisTypeToSchemaKey, 
  analysisTypeToTypeLiteral 
} from "@/shared/types/analysis";

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

    const m = [];

    for (const message of data.messages) {
      if (message.content.length < 500) {
        m.push(message);
      }
    }

    const smallMessages = smallChatBuilder(m);

    // Perform comprehensive analysis using messages from request
    const comprehensiveAnalysisData = await analyzeAllChatTypesPrivate(
      data.title,
      smallMessages
    );

    // If ghost mode is enabled, return analysis results without saving anything to database
    if (data.isGhostMode) {
      // Get all analysis types using utility function
      const analysisTypes = getAllAnalysisTypes();
      
      // Format analysis results for ghost mode response
      const ghostAnalyses = analysisTypes.map((analysisType) => {
      const schemaKey = analysisTypeToSchemaKey(analysisType);
      const analysisResult = comprehensiveAnalysisData.analyses[schemaKey as keyof typeof comprehensiveAnalysisData.analyses];
        
        if (!analysisResult) {
          throw new Error(`Analysis result for ${analysisType} is missing or undefined`);
        }
        
        // Add the type field back to the analysis result
        return {
          id: `ghost-${Date.now()}-${analysisType}`, // Temporary ID for ghost mode
          chatId: null,
          userId: authenticatedUserId,
          result: {
            type: analysisTypeToTypeLiteral(analysisType),
            ...analysisResult
          },
          status: AnalysisStatus.COMPLETED,
          error: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });

      return ApiResponse.success(
        {
          chat: {
            id: `ghost-${Date.now()}`, // Temporary ID for ghost mode
            title: data.title,
            participants: [...new Set(smallMessages.map(message => message.sender))],
            userId: authenticatedUserId,
            isPrivacy: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          analyses: ghostAnalyses
        },
        "Ghost analysis completed! No data was saved.",
        200
      ).toResponse();
    }

    // Regular privacy analysis - save chat and analyses to database
    // Extract participants from messages for the chat record
    const participants = [...new Set(smallMessages.map(message => message.sender))];

    // Create chat record WITHOUT storing messages, marked as privacy
    const chat = await prisma.chat.create({
      data: {
        title: data.title,
        participants: participants,
        userId: authenticatedUserId,
        isPrivacy: true, // Mark as privacy chat
      }
    });

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
          status: AnalysisStatus.COMPLETED,
          error: null,
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