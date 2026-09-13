-- CreateEnum
CREATE TYPE "PetRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- CreateEnum
CREATE TYPE "UserPetSource" AS ENUM ('OFFICIAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "UserPetStatus" AS ENUM ('PRESENT', 'TEMPORARILY_AWAY');

-- CreateEnum
CREATE TYPE "UserEggStatus" AS ENUM ('AVAILABLE', 'INCUBATING', 'HATCHED');

-- CreateEnum
CREATE TYPE "CosmeticType" AS ENUM ('FRAME', 'BADGE');

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetSpecies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rarity" "PetRarity" NOT NULL,
    "imagePath" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetSpecies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetEvolution" (
    "id" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetEvolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EggType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCoins" INTEGER NOT NULL,
    "incubationXp" INTEGER NOT NULL,
    "imagePath" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EggType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EggRarityProbability" (
    "id" TEXT NOT NULL,
    "eggTypeId" TEXT NOT NULL,
    "rarity" "PetRarity" NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "EggRarityProbability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEgg" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "eggTypeId" TEXT NOT NULL,
    "status" "UserEggStatus" NOT NULL DEFAULT 'AVAILABLE',
    "incubationXp" INTEGER NOT NULL DEFAULT 0,
    "incubationRequiredXp" INTEGER NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incubationStartedAt" TIMESTAMP(3),
    "hatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEgg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetShopPurchase" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "eggTypeId" TEXT NOT NULL,
    "userEggId" TEXT NOT NULL,
    "priceCoins" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetShopPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "UserPetSource" NOT NULL,
    "name" TEXT NOT NULL,
    "speciesId" TEXT,
    "rarity" "PetRarity",
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "happiness" INTEGER NOT NULL DEFAULT 80,
    "status" "UserPetStatus" NOT NULL DEFAULT 'PRESENT',
    "evolutionId" TEXT,
    "customImagePath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAcademicActivity" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeciesFragment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeciesFragment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cosmetic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "CosmeticType" NOT NULL,
    "priceCoins" INTEGER NOT NULL,
    "imagePath" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCosmetic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "cosmeticId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_userId_key" ON "Inventory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PetSpecies_slug_key" ON "PetSpecies"("slug");

-- CreateIndex
CREATE INDEX "PetSpecies_isOfficial_rarity_idx" ON "PetSpecies"("isOfficial", "rarity");

-- CreateIndex
CREATE INDEX "PetEvolution_speciesId_level_idx" ON "PetEvolution"("speciesId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "PetEvolution_speciesId_level_key" ON "PetEvolution"("speciesId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "EggType_slug_key" ON "EggType"("slug");

-- CreateIndex
CREATE INDEX "EggRarityProbability_eggTypeId_weight_idx" ON "EggRarityProbability"("eggTypeId", "weight");

-- CreateIndex
CREATE UNIQUE INDEX "EggRarityProbability_eggTypeId_rarity_key" ON "EggRarityProbability"("eggTypeId", "rarity");

-- CreateIndex
CREATE INDEX "UserEgg_userId_status_idx" ON "UserEgg"("userId", "status");

-- CreateIndex
CREATE INDEX "UserEgg_inventoryId_status_idx" ON "UserEgg"("inventoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PetShopPurchase_userEggId_key" ON "PetShopPurchase"("userEggId");

-- CreateIndex
CREATE INDEX "PetShopPurchase_userId_createdAt_idx" ON "PetShopPurchase"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PetShopPurchase_userId_requestId_key" ON "PetShopPurchase"("userId", "requestId");

-- CreateIndex
CREATE INDEX "UserPet_userId_source_idx" ON "UserPet"("userId", "source");

-- CreateIndex
CREATE INDEX "UserPet_userId_isActive_idx" ON "UserPet"("userId", "isActive");

-- CreateIndex
CREATE INDEX "UserPet_speciesId_idx" ON "UserPet"("speciesId");

-- CreateIndex
CREATE INDEX "SpeciesFragment_userId_speciesId_idx" ON "SpeciesFragment"("userId", "speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesFragment_inventoryId_speciesId_key" ON "SpeciesFragment"("inventoryId", "speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "Cosmetic_slug_key" ON "Cosmetic"("slug");

-- CreateIndex
CREATE INDEX "UserCosmetic_userId_cosmeticId_idx" ON "UserCosmetic"("userId", "cosmeticId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCosmetic_inventoryId_cosmeticId_key" ON "UserCosmetic"("inventoryId", "cosmeticId");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetEvolution" ADD CONSTRAINT "PetEvolution_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "PetSpecies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EggRarityProbability" ADD CONSTRAINT "EggRarityProbability_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "EggType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEgg" ADD CONSTRAINT "UserEgg_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEgg" ADD CONSTRAINT "UserEgg_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEgg" ADD CONSTRAINT "UserEgg_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "EggType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetShopPurchase" ADD CONSTRAINT "PetShopPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetShopPurchase" ADD CONSTRAINT "PetShopPurchase_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetShopPurchase" ADD CONSTRAINT "PetShopPurchase_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "EggType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetShopPurchase" ADD CONSTRAINT "PetShopPurchase_userEggId_fkey" FOREIGN KEY ("userEggId") REFERENCES "UserEgg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPet" ADD CONSTRAINT "UserPet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPet" ADD CONSTRAINT "UserPet_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "PetSpecies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPet" ADD CONSTRAINT "UserPet_evolutionId_fkey" FOREIGN KEY ("evolutionId") REFERENCES "PetEvolution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeciesFragment" ADD CONSTRAINT "SpeciesFragment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeciesFragment" ADD CONSTRAINT "SpeciesFragment_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeciesFragment" ADD CONSTRAINT "SpeciesFragment_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "PetSpecies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCosmetic" ADD CONSTRAINT "UserCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCosmetic" ADD CONSTRAINT "UserCosmetic_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCosmetic" ADD CONSTRAINT "UserCosmetic_cosmeticId_fkey" FOREIGN KEY ("cosmeticId") REFERENCES "Cosmetic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
