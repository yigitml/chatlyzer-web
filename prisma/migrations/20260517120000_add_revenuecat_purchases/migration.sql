-- CreateTable
CREATE TABLE "RevenueCatPurchase" (
    "id" TEXT NOT NULL,
    "revenueCatTransactionId" TEXT NOT NULL,
    "storeTransactionId" TEXT,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "store" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "creditsGranted" INTEGER NOT NULL DEFAULT 0,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RevenueCatPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevenueCatPurchase_revenueCatTransactionId_key" ON "RevenueCatPurchase"("revenueCatTransactionId");

-- CreateIndex
CREATE INDEX "RevenueCatPurchase_userId_idx" ON "RevenueCatPurchase"("userId");

-- CreateIndex
CREATE INDEX "RevenueCatPurchase_productId_idx" ON "RevenueCatPurchase"("productId");

-- AddForeignKey
ALTER TABLE "RevenueCatPurchase" ADD CONSTRAINT "RevenueCatPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
