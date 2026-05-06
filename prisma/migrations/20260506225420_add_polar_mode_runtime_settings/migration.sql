/*
  Warnings:

  - A unique constraint covering the columns `[polarOrderId,polarMode]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Order_polarOrderId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "polarMode" TEXT NOT NULL DEFAULT 'production';

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_polarOrderId_polarMode_key" ON "Order"("polarOrderId", "polarMode");
