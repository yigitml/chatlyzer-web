import { randomUUID } from "node:crypto";
import prisma from "./prisma";
import { AnalysisStatus, CreditType, Prisma } from "../../generated/client/client";
import { debitJobCredits, refundUserCredits } from "./consumeUserCredits";
import { lockActiveAccount } from "./accountLock";
import { ApiError } from "./apiBoundary";
import { getAllAnalysisTypes } from "@/shared/types/analysis";

export const JOB_LEASE_MS = 120_000; // Provider timeout is 60 seconds, with no SDK retries.
export class JobError extends ApiError { constructor(message: string, status = 409) { super(message, status); } }

async function failUnderLock(tx: Prisma.TransactionClient, job: Awaited<ReturnType<typeof tx.analysisJob.findUnique>> & {}, reason: string) {
  if (!job || job.status !== "PROCESSING") return;
  await refundUserCredits(job.userId, CreditType.ANALYSIS, job.debitAmount, tx, job.debitEnvironment);
  await tx.analysis.updateMany({ where: { jobId: job.id, deletedAt: null }, data: { status: AnalysisStatus.FAILED, error: reason } });
  await tx.analysisJob.update({ where: { id: job.id }, data: { status: "FAILED", refundedAt: new Date(), error: reason } });
}

export async function reconcileAnalysisJobs(userId?: string) {
  const stale = await prisma.analysisJob.findMany({ where: { ...(userId ? { userId } : {}), status: "PROCESSING", leaseExpiresAt: { lte: new Date() } }, take: 100 });
  for (const candidate of stale) {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${candidate.userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: candidate.userId } });
      const job = await tx.analysisJob.findUnique({ where: { id: candidate.id } });
      if (!job || job.status !== "PROCESSING" || job.leaseExpiresAt > new Date()) return;
      if (!user || user.deletedAt || !user.isActive) {
        await tx.analysisJob.update({ where: { id: job.id }, data: { status: "CANCELLED", error: "Account generation expired" } });
        return;
      }
      await failUnderLock(tx, job, "Analysis interrupted; credits refunded. Retry with a new request key.");
    });
  }
  return stale.length;
}

export async function reserveAnalysisJob(userId: string, mode: "STANDARD" | "PRIVACY" | "GHOST", requestKey?: string | null, chatId?: string, expectedAccountVersion?: number) {
  await reconcileAnalysisJobs(userId);
  return prisma.$transaction(async tx => {
    const user = await lockActiveAccount(tx, userId, expectedAccountVersion);
    const key = requestKey || randomUUID();
    const existing = await tx.analysisJob.findUnique({ where: { userId_requestKey: { userId, requestKey: key } } });
    if (existing) {
      if (existing.mode !== mode || (mode === "STANDARD" && existing.chatId !== chatId)) throw new JobError("Request key belongs to another analysis");
      return { job: existing, isNew: false };
    }
    if (mode === "STANDARD") {
      const chat = await tx.chat.findFirst({ where: { id: chatId, userId, deletedAt: null } });
      if (!chat) throw new JobError("Chat not found", 404);
      const active = await tx.analysis.count({ where: { chatId, userId, deletedAt: null, status: { in: [AnalysisStatus.COMPLETED, AnalysisStatus.PROCESSING, AnalysisStatus.PENDING] } } });
      if (active) throw new JobError("Analysis already exists or is in progress for this chat");
    }
    // Unique reservation is durable before any debit; both commit together.
    let job = await tx.analysisJob.create({ data: { userId, requestKey: key, mode, chatId, accountVersion: user.tokenVersion, leaseExpiresAt: new Date(Date.now() + JOB_LEASE_MS) } });
    const environment = await debitJobCredits(userId, job.debitAmount, tx);
    if (!environment) throw new JobError("Insufficient credits", 402);
    job = await tx.analysisJob.update({ where: { id: job.id }, data: { debitEnvironment: environment } });
    if (mode === "STANDARD") {
      for (let index = 0; index < getAllAnalysisTypes().length; index++) await tx.analysis.create({ data: { userId, chatId: chatId!, requestKey: key, jobId: job.id, status: AnalysisStatus.PROCESSING } });
    }
    return { job, isNew: true };
  });
}

export async function completeAnalysisJob<T>(jobId: string, persist: (tx: Prisma.TransactionClient) => Promise<T>) {
  const candidate = await prisma.analysisJob.findUniqueOrThrow({ where: { id: jobId } });
  return prisma.$transaction(async tx => {
    await lockActiveAccount(tx, candidate.userId, candidate.accountVersion);
    const job = await tx.analysisJob.findUniqueOrThrow({ where: { id: jobId } });
    if (job.status !== "PROCESSING" || job.leaseExpiresAt <= new Date()) throw new JobError("Analysis lease expired or job cancelled");
    if (job.mode === "STANDARD" && !await tx.chat.findFirst({ where: { id: job.chatId!, userId: job.userId, deletedAt: null } })) throw new JobError("Chat was deleted", 404);
    const result = await persist(tx);
    await tx.analysisJob.update({ where: { id: jobId }, data: { status: "COMPLETED" } });
    return result;
  });
}

export async function failAnalysisJob(jobId: string) {
  const candidate = await prisma.analysisJob.findUniqueOrThrow({ where: { id: jobId } });
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${candidate.userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: candidate.userId } });
    const job = await tx.analysisJob.findUniqueOrThrow({ where: { id: jobId } });
    if (job.status !== "PROCESSING") return;
    if (!user || !user.isActive || user.deletedAt) {
      await tx.analysisJob.update({ where: { id: jobId }, data: { status: "CANCELLED", error: "Account generation expired" } });
      return;
    }
    await failUnderLock(tx, job, "Analysis failed; credits refunded. Retry with a new request key.");
  });
}

/** Caller already holds the account lock. Chat deletion cancels and refunds once. */
export async function cancelChatJobs(tx: Prisma.TransactionClient, userId: string, chatId: string) {
  const jobs = await tx.analysisJob.findMany({ where: { userId, chatId, status: "PROCESSING" } });
  for (const job of jobs) {
    await failUnderLock(tx, job, "Chat was deleted; credits refunded.");
    await tx.analysisJob.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
  }
}
