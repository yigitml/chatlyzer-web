-- Forward-only account generations, durable non-content jobs and isolated billing.
-- Never silently pick an owner for an ambiguous historical Google subject.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE "googleId" IS NOT NULL GROUP BY "googleId" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate Google subjects require explicit account reconciliation before this migration';
  END IF;
END $$;
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
ALTER TABLE "UserSession" ADD COLUMN "loginGeneration" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  ADD COLUMN "refreshTokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserSession" ALTER COLUMN "loginGeneration" DROP DEFAULT;
ALTER TABLE "UserDevice" ADD COLUMN "loginGeneration" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "UserDevice" ALTER COLUMN "loginGeneration" DROP DEFAULT;
ALTER TABLE "UserCredit" ADD COLUMN "sandboxAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sandboxTotalAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RevenueCatPurchase" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "reversedAt" TIMESTAMP(3);
-- Existing purchases remain explicitly legacy/quarantined for merchant reconciliation.
-- Existing non-null results were incorrectly assigned PENDING by the old migration.
UPDATE "Analysis" SET "status" = 'COMPLETED' WHERE "status" = 'PENDING' AND "result" IS NOT NULL AND "result" <> '{}'::jsonb;
-- Legacy in-progress requests have no reliable debit identity. Retain them visibly failed;
-- never invent refunds that cannot be tied to a committed debit.
UPDATE "Analysis" SET "status" = 'FAILED', "error" = 'Legacy interrupted analysis: contact support for debit reconciliation' WHERE "status" IN ('PENDING','PROCESSING');
CREATE TABLE "AnalysisJob" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "userId" TEXT NOT NULL,
 "requestKey" TEXT NOT NULL,
 "mode" TEXT NOT NULL,
 "chatId" TEXT,
 "status" TEXT NOT NULL DEFAULT 'PROCESSING',
 "accountVersion" INTEGER NOT NULL,
 "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
 "debitAmount" INTEGER NOT NULL DEFAULT 8,
 "debitEnvironment" TEXT NOT NULL DEFAULT 'production',
 "refundedAt" TIMESTAMP(3),
 "error" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AnalysisJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AnalysisJob_userId_requestKey_key" ON "AnalysisJob"("userId","requestKey");
CREATE INDEX "AnalysisJob_status_leaseExpiresAt_idx" ON "AnalysisJob"("status","leaseExpiresAt");
ALTER TABLE "Analysis" ADD COLUMN "jobId" TEXT;
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AnalysisJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Analysis_jobId_idx" ON "Analysis"("jobId");
CREATE TABLE "RevenueCatEvent" ("id" TEXT NOT NULL PRIMARY KEY,"type" TEXT NOT NULL,"disposition" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- Reclassify historical grants once. Refunds can expose debt when grants were spent;
-- production debits stop until the debt is repaid. Unknown environments are quarantined.
WITH totals AS (
 SELECT "userId", SUM("creditsGranted")::integer AS total,
 SUM(CASE WHEN "rawPayload"->>'is_sandbox' = 'true' THEN "creditsGranted" ELSE 0 END)::integer AS sandbox
 FROM "RevenueCatPurchase" WHERE "deletedAt" IS NULL GROUP BY "userId"
)
UPDATE "UserCredit" c SET "amount" = c."amount" - t.total,
 "sandboxAmount" = c."sandboxAmount" + t.sandbox,
 "sandboxTotalAmount" = c."sandboxTotalAmount" + t.sandbox
FROM totals t WHERE c."userId" = t."userId" AND c."type" = 'ANALYSIS';
UPDATE "RevenueCatPurchase" SET "environment" = CASE WHEN "rawPayload"->>'is_sandbox' = 'true' THEN 'sandbox' ELSE 'legacy' END;
