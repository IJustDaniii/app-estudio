-- CreateTable
CREATE TABLE "CosmeticPurchase" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "cosmeticId" TEXT NOT NULL,
    "priceCoins" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CosmeticPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CosmeticPurchase_userId_createdAt_idx" ON "CosmeticPurchase"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticPurchase_userId_requestId_key" ON "CosmeticPurchase"("userId", "requestId");

-- AddForeignKey
ALTER TABLE "CosmeticPurchase" ADD CONSTRAINT "CosmeticPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosmeticPurchase" ADD CONSTRAINT "CosmeticPurchase_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosmeticPurchase" ADD CONSTRAINT "CosmeticPurchase_cosmeticId_fkey" FOREIGN KEY ("cosmeticId") REFERENCES "Cosmetic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
