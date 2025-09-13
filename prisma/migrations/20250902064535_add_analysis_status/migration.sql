-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "error" TEXT,
ADD COLUMN     "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "result" DROP NOT NULL;
