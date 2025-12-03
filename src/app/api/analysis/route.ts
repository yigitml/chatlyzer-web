import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import prisma from "@/backend/lib/prisma";
import type {
  AnalysisPostRequest,
  AnalysisPutRequest,
  AnalysisDeleteRequest,
  AnalysisType,
} from "@/shared/types/api/apiRequest";
import { analyzeAllChatTypes } from "@/backend/lib/openai";
import { consumeUserCredits, refundUserCredits } from "@/backend/lib/consumeUserCredits";
import { CreditType, AnalysisStatus, Prisma } from "../../../generated/client/client";
import { 
  getAllAnalysisTypes, 
  analysisTypeToSchemaKey, 
  analysisTypeToTypeLiteral 
} from "@/shared/types/analysis";

export const GET = withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const chatId = searchParams.get("chatId");
    const authenticatedUserId = request.user!.id;

    // Cleanup stuck analyses older than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.analysis.updateMany({
      where: {
        userId: authenticatedUserId,
        status: {
          in: [AnalysisStatus.PENDING, AnalysisStatus.PROCESSING]
        },
        createdAt: {
          lt: tenMinutesAgo
        },
        deletedAt: null
      },
      data: {
        status: AnalysisStatus.FAILED,
        error: "Analysis timed out - please try again"
      }
    });

    if (id) {
      const analysis = await prisma.analysis.findFirst({
        where: {
          id: id,
          userId: authenticatedUserId,
          deletedAt: null,
        },
      });
      if (analysis) {
        return ApiResponse.success(analysis).toResponse();
      }
      return ApiResponse.error("analysis not found").toResponse();
    } else if (chatId) {
      const includeInProgress = searchParams.get("includeInProgress") === "true";
      const analyzes = await prisma.analysis.findMany({
        where: {
          userId: authenticatedUserId,
          chatId,
          deletedAt: null,
          ...(includeInProgress ? {} : { status: AnalysisStatus.COMPLETED })
        },
      });
      return ApiResponse.success(analyzes).toResponse();
    } else {
      const analyzes = await prisma.analysis.findMany({
        where: {
          userId: authenticatedUserId,
          deletedAt: null,
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

    // Start transaction with default isolation level (ReadCommitted)
    const placeholderAnalyses = await prisma.$transaction(async (tx) => {
      // Acquire advisory lock for this chat ID to prevent concurrent analysis creation
      // hashtext(text) returns an integer, which we use for the lock key
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.chatId}))`;

      // Check if analyses already exist or are in progress for this chat
      const existingAnalyses = await tx.analysis.findMany({
        where: {
          chatId: data.chatId,
          userId: authenticatedUserId,
          deletedAt: null,
        }
      });

      // Check for completed analyses
      const completedAnalyses = existingAnalyses.filter(a => a.status === AnalysisStatus.COMPLETED);
      if (completedAnalyses.length > 0) {
        throw new Error("Analyses already exist for this chat");
      }

      // Check for pending or processing analyses
      const inProgressAnalyses = existingAnalyses.filter(a => 
        a.status === AnalysisStatus.PENDING || a.status === AnalysisStatus.PROCESSING
      );
      if (inProgressAnalyses.length > 0) {
        throw new Error("Analysis is already in progress for this chat");
      }

      // Consume 8 credits for comprehensive analysis
      const creditConsumption = await consumeUserCredits(authenticatedUserId, CreditType.ANALYSIS, 8, tx);

      if (!creditConsumption) {
        throw new Error("Insufficient credits");
      }

      // Get all analysis types using utility function
      const analysisTypes = getAllAnalysisTypes();

      // Create placeholder analysis records with PROCESSING status
      const createdAnalyses = [];
      for (const analysisType of analysisTypes) {
        const analysis = await tx.analysis.create({
          data: {
            chatId: data.chatId,
            userId: authenticatedUserId,
            status: AnalysisStatus.PROCESSING,
            result: {},
          }
        });
        createdAnalyses.push(analysis);
      }
      
      return createdAnalyses;
    });

    // Get analysis types again for the next step (or reuse if we could, but it's cheap)
    const analysisTypes = getAllAnalysisTypes();

   try {
     // Perform comprehensive analysis
     const comprehensiveAnalysisData = await analyzeAllChatTypes(data.chatId);

     // Update analysis records with results
     const updatePromises = analysisTypes.map(async (analysisType, index) => {
       const analysis = placeholderAnalyses[index];
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
       
       return prisma.analysis.update({
         where: { id: analysis.id },
         data: {
           result: analysisWithType,
           status: AnalysisStatus.COMPLETED,
           error: null,
         }
       });
     });

     const analyses = await Promise.all(updatePromises);

     return ApiResponse.success(
      analyses,
      "Comprehensive analysis completed successfully!",
      200
     ).toResponse();

   } catch (analysisError) {
     // Mark all analyses as failed
     await prisma.analysis.updateMany({
       where: {
         id: { in: placeholderAnalyses.map(a => a.id) }
       },
       data: {
         status: AnalysisStatus.FAILED,
         error: analysisError instanceof Error ? analysisError.message : 'Analysis failed'
       }
     });

      // Refund credits since analysis failed
      console.log(`Refunding 8 credits to user ${authenticatedUserId} due to analysis failure`);
      await refundUserCredits(authenticatedUserId, CreditType.ANALYSIS, 8);

      throw analysisError;
    }

  } catch (error: any) {
    console.error("Error processing POST /api/analysis", error);
    
    if (error.code === 'P2034') {
      return ApiResponse.error("Analysis already in progress (concurrency conflict)", 409).toResponse();
    }

    if (error.message === "Insufficient credits") {
      return ApiResponse.error("Insufficient credits", 402).toResponse();
    }
    if (error.message === "Analyses already exist for this chat" || error.message === "Analysis is already in progress for this chat") {
      return ApiResponse.error(error.message, 400).toResponse();
    }
    return ApiResponse.error(`Failed to process request: ${error.message}`, 500).toResponse();
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