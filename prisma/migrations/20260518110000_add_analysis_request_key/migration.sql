-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN "requestKey" TEXT;

-- CreateIndex
CREATE INDEX "Analysis_userId_requestKey_idx" ON "Analysis"("userId", "requestKey");

-- CreateIndex
CREATE INDEX "Analysis_chatId_requestKey_idx" ON "Analysis"("chatId", "requestKey");
