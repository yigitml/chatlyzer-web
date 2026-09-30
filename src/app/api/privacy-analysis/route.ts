import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withAnalysisRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import prisma from "@/backend/lib/prisma";
import { analyzeAllChatTypesPrivate } from "@/backend/lib/openai";
import {
  reserveAnalysisJob,
  completeAnalysisJob,
  failAnalysisJob,
  JobError,
} from "@/backend/lib/analysisJobs";
import { readJson, apiErrorResponse } from "@/backend/lib/apiBoundary";
import { logger } from "@/backend/lib/logger";
import { AnalysisStatus } from "../../../generated/client/client";
import {
  getAllAnalysisTypes,
  analysisTypeToSchemaKey,
  analysisTypeToTypeLiteral,
} from "@/shared/types/analysis";
import {
  getValidationMessage,
  privacyAnalysisPostSchema,
} from "@/shared/types/api/requestSchemas";

export const POST = withProtectedRoute(
  withAnalysisRateLimiter(async (request: NextRequest) => {
    let jobId: string | undefined;
    try {
      const parsed = privacyAnalysisPostSchema.safeParse(
        await readJson(request),
      );
      if (!parsed.success)
        return ApiResponse.error(
          getValidationMessage(parsed.error),
          400,
        ).toResponse();
      const data = parsed.data;
      const userId = request.user!.id;
      const { job, isNew } = await reserveAnalysisJob(
        userId,
        data.isGhostMode ? "GHOST" : "PRIVACY",
        data.requestKey,
        undefined,
        request.user!.tokenVersion,
      );
      if (!isNew) {
        if (job.status === "PROCESSING")
          return ApiResponse.success(
            {
              chat: null,
              analyses: [],
              job: { id: job.id, status: job.status },
            },
            "Analysis is processing",
            202,
          ).toResponse();
        if (job.status !== "COMPLETED")
          throw new JobError("Analysis failed; retry with a new request key");
        if (job.mode === "GHOST")
          throw new JobError(
            "Ghost result was not retained; use a new request key to run again",
            410,
          );
        const chat = await prisma.chat.findFirst({
          where: { id: job.chatId!, userId, deletedAt: null },
        });
        const analyses = await prisma.analysis.findMany({
          where: { jobId: job.id, userId, deletedAt: null },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        if (!chat || analyses.length !== getAllAnalysisTypes().length)
          throw new JobError("Saved analysis was deleted", 410);
        return ApiResponse.success({ chat, analyses }).toResponse();
      }
      jobId = job.id;
      // Full validated input goes to the provider boundary: exact metrics precede sampling.
      const output = await analyzeAllChatTypesPrivate(
        data.title,
        data.messages,
      );
      const results = getAllAnalysisTypes().map((type) => {
        const result =
          output.analyses[
            analysisTypeToSchemaKey(type) as keyof typeof output.analyses
          ];
        if (!result) throw new Error("Incomplete provider analysis");
        return { ...result, type: analysisTypeToTypeLiteral(type) };
      });
      const payload = await completeAnalysisJob(job.id, async (tx) => {
        const now = new Date();
        const participants = [
          ...new Set(data.messages.map((message) => message.sender)),
        ];
        if (data.isGhostMode)
          return {
            chat: {
              id: `ghost-${job.id}`,
              title: data.title,
              participants,
              userId,
              isPrivacy: true,
              createdAt: now,
              updatedAt: now,
            },
            analyses: results.map((result, index) => ({
              id: `ghost-${job.id}-${index}`,
              chatId: "",
              userId,
              result,
              status: AnalysisStatus.COMPLETED,
              error: null,
              createdAt: now,
              updatedAt: now,
            })),
          };
        const chat = await tx.chat.create({
          data: { title: data.title, participants, userId, isPrivacy: true },
        });
        const analyses = [];
        for (const result of results)
          analyses.push(
            await tx.analysis.create({
              data: {
                chatId: chat.id,
                userId,
                requestKey: job.requestKey,
                jobId: job.id,
                result,
                status: AnalysisStatus.COMPLETED,
              },
            }),
          );
        await tx.analysisJob.update({
          where: { id: job.id },
          data: { chatId: chat.id },
        });
        return { chat, analyses };
      });
      return ApiResponse.success(
        payload,
        data.isGhostMode
          ? "Ghost analysis complete. Only a content-free billing reservation is retained; results cannot be replayed."
          : "Privacy analysis complete. Messages were not stored.",
      ).toResponse();
    } catch (error) {
      if (jobId) {
        try {
          await failAnalysisJob(jobId);
        } catch (recoveryError) {
          logger.error(
            "Privacy job recovery deferred to lease reconciler",
            recoveryError,
          );
        }
      }
      return apiErrorResponse(error);
    }
  }),
);
