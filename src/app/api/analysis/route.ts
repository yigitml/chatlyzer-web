import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withAnalysisRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import prisma from "@/backend/lib/prisma";
import type {
  AnalysisPutRequest,
  AnalysisDeleteRequest,
} from "@/shared/types/api/apiRequest";
import { analyzeAllChatTypes } from "@/backend/lib/openai";
import { reserveAnalysisJob, completeAnalysisJob, failAnalysisJob, reconcileAnalysisJobs, JobError } from "@/backend/lib/analysisJobs";
import { lockActiveAccount } from "@/backend/lib/accountLock";
import { readJson, apiErrorResponse } from "@/backend/lib/apiBoundary";
import { AnalysisStatus } from "../../../generated/client/client";
import { 
  getAllAnalysisTypes, 
  analysisTypeToSchemaKey, 
  analysisTypeToTypeLiteral 
} from "@/shared/types/analysis";
import { logger } from "@/backend/lib/logger";
import {
  analysisPostSchema,
  analysisPutSchema,
  getValidationMessage,
  idBodySchema,
} from "@/shared/types/api/requestSchemas";
import { getPagination, paginateResults, paginationHeaders } from "@/shared/utils/pagination";

export const GET = withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const chatId = searchParams.get("chatId");
    const authenticatedUserId = request.user!.id;

    await reconcileAnalysisJobs(authenticatedUserId);

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
      return ApiResponse.error("Analysis not found", 404).toResponse();
    } else if (chatId) {
      const includeInProgress = searchParams.get("includeInProgress") === "true";
      const pagination = getPagination(searchParams);
      const analyzes = await prisma.analysis.findMany({
        where: {
          userId: authenticatedUserId,
          chatId,
          deletedAt: null,
          ...(includeInProgress ? {} : { status: AnalysisStatus.COMPLETED })
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: pagination.take,
        ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      });
      const page = paginateResults(analyzes, pagination.limit);
      return ApiResponse.success(page.items).toResponse(paginationHeaders(page.pageInfo));
    } else {
      const pagination = getPagination(searchParams);
      const analyzes = await prisma.analysis.findMany({
        where: {
          userId: authenticatedUserId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: pagination.take,
        ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      });
      const page = paginateResults(analyzes, pagination.limit);
      return ApiResponse.success(page.items).toResponse(paginationHeaders(page.pageInfo));
    }
  } catch (error) {
   logger.error("Error processing GET /api/analysis", error);
   return apiErrorResponse(error);
  }
});

export const POST = withProtectedRoute(withAnalysisRateLimiter(async (request: NextRequest) => {
  let jobId: string | undefined;
  try {
    const parsed = analysisPostSchema.safeParse(await readJson(request));
    if (!parsed.success) return ApiResponse.error(getValidationMessage(parsed.error), 400).toResponse();
    const data = parsed.data;
    const reservation = await reserveAnalysisJob(request.user!.id, "STANDARD", data.requestKey, data.chatId, request.user!.tokenVersion);
    const { job, isNew } = reservation;
    if (!isNew) {
      if (job.status === "FAILED" || job.status === "CANCELLED") throw new JobError("Analysis failed; retry with a new request key");
      const analyses = await prisma.analysis.findMany({ where: { jobId: job.id, deletedAt: null }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      return ApiResponse.success(analyses, "Analysis request already exists", job.status === "PROCESSING" ? 202 : 200).toResponse();
    }
    jobId = job.id;
    const output = await analyzeAllChatTypes(data.chatId, request.user!.id);
    const analyses = await completeAnalysisJob(job.id, async tx => {
      const rows = await tx.analysis.findMany({ where: { jobId: job.id, deletedAt: null }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const types = getAllAnalysisTypes();
      if (rows.length !== types.length) throw new JobError("Analysis set was changed while processing");
      const completed = [];
      for (let index = 0; index < types.length; index++) {
        const type = types[index];
        const result = output.analyses[analysisTypeToSchemaKey(type) as keyof typeof output.analyses];
        if (!result) throw new Error("Incomplete provider analysis");
        completed.push(await tx.analysis.update({ where: { id: rows[index].id }, data: { result: { ...result, type: analysisTypeToTypeLiteral(type) }, status: AnalysisStatus.COMPLETED, error: null } }));
      }
      return completed;
    });
    return ApiResponse.success(analyses, "Comprehensive analysis completed successfully!", 200).toResponse();
  } catch (error) {
    if (jobId) {
      try { await failAnalysisJob(jobId); }
      catch (recoveryError) { logger.error("Analysis recovery deferred to lease reconciler", recoveryError); }
    }
    return apiErrorResponse(error);
  }
}));

export const PUT = withProtectedRoute(async (request: NextRequest) => {
  try {
    const authenticatedUserId = request.user!.id;
    const parsed = analysisPutSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return ApiResponse.error(getValidationMessage(parsed.error), 400).toResponse();
    }
    const data: AnalysisPutRequest = parsed.data as AnalysisPutRequest;
    const { id, result } = data;

    const updatedanalysis = await prisma.$transaction(async tx => {
      await lockActiveAccount(tx, authenticatedUserId, request.user!.tokenVersion);
      return tx.analysis.update({
      where: {
        id,
        userId: authenticatedUserId,
        deletedAt: null,
      },
      data: {
        result: result,
      },
    });
    });

    if (!updatedanalysis) {
      return ApiResponse.error("Analysis not found", 404).toResponse();
    }

    return ApiResponse.success(
      updatedanalysis,
      "analysis updated successfully!",
      200
    ).toResponse();
  } catch (error) {
    logger.error("Error processing PUT /api/analysis", error);
    return apiErrorResponse(error);
  }
});

export const DELETE = withProtectedRoute(async (request: NextRequest) => {
    try {
      const authenticatedUserId = request.user!.id;
      const parsed = idBodySchema.safeParse(await readJson(request));
      if (!parsed.success) {
        return ApiResponse.error(getValidationMessage(parsed.error), 400).toResponse();
      }
      const { id } = parsed.data as AnalysisDeleteRequest;

      const deletedanalysis = await prisma.$transaction(async tx => {
        await lockActiveAccount(tx, authenticatedUserId, request.user!.tokenVersion);
        return tx.analysis.update({
        where: {
          id,
          userId: authenticatedUserId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
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
    logger.error("Error processing DELETE /api/analysis", error);
    return apiErrorResponse(error);
  }
});
