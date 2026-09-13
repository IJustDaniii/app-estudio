import "server-only";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PET_RARITIES, PET_RULES, type PetRarity } from "@/lib/pets/config";

type Transaction = Prisma.TransactionClient;

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function requireRequestId(requestId: string) {
  if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(requestId)) throw new Error("INVALID_REQUEST_ID");
}

function nextRarity(probabilities: Array<{ rarity: PetRarity; weight: number }>) {
  const total = probabilities.reduce((sum, item) => sum + item.weight, 0);
  if (total !== 10_000 || probabilities.some((item) => item.weight < 0)) throw new Error("INVALID_PROBABILITIES");
  let roll = randomInt(0, total);
  for (const rarity of PET_RARITIES) {
    const weight = probabilities.find((item) => item.rarity === rarity)?.weight ?? 0;
    if (roll < weight) return rarity;
    roll -= weight;
  }
  throw new Error("INVALID_PROBABILITIES");
}

function levelForXp(xp: number) {
  return Math.floor(Math.max(0, xp) / PET_RULES.xpPerLevel) + 1;
}

export async function purchaseEggForUser(userId: string, eggTypeSlug: string, requestId: string) {
  requireRequestId(requestId);
  const existing = await prisma.petShopPurchase.findUnique({
    where: { userId_requestId: { userId, requestId } },
    select: { eggTypeId: true, userEggId: true, priceCoins: true },
  });
  if (existing) {
    const eggType = await prisma.eggType.findFirst({ where: { id: existing.eggTypeId, slug: eggTypeSlug }, select: { id: true } });
    if (!eggType) throw new Error("IDEMPOTENCY_CONFLICT");
    return { duplicate: true, userEggId: existing.userEggId, priceCoins: existing.priceCoins };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const eggType = await tx.eggType.findFirst({ where: { slug: eggTypeSlug, isAvailable: true } });
      if (!eggType) throw new Error("EGG_NOT_AVAILABLE");
      const inventory = await tx.inventory.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true } });
      const charged = await tx.user.updateMany({ where: { id: userId, coins: { gte: eggType.priceCoins } }, data: { coins: { decrement: eggType.priceCoins } } });
      if (charged.count !== 1) throw new Error("INSUFFICIENT_COINS");
      const userEgg = await tx.userEgg.create({
        data: { userId, inventoryId: inventory.id, eggTypeId: eggType.id, incubationRequiredXp: eggType.incubationXp },
        select: { id: true },
      });
      await tx.petShopPurchase.create({ data: { requestId, userId, inventoryId: inventory.id, eggTypeId: eggType.id, userEggId: userEgg.id, priceCoins: eggType.priceCoins } });
      return { duplicate: false, userEggId: userEgg.id, priceCoins: eggType.priceCoins };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const replay = await prisma.petShopPurchase.findUnique({ where: { userId_requestId: { userId, requestId } }, select: { eggTypeId: true, userEggId: true, priceCoins: true } });
    if (!replay) throw error;
    const sameEgg = await prisma.eggType.findFirst({ where: { id: replay.eggTypeId, slug: eggTypeSlug }, select: { id: true } });
    if (!sameEgg) throw new Error("IDEMPOTENCY_CONFLICT");
    return { duplicate: true, userEggId: replay.userEggId, priceCoins: replay.priceCoins };
  }
}

export async function purchaseCosmeticForUser(userId: string, cosmeticSlug: string, requestId: string) {
  requireRequestId(requestId);
  const existing = await prisma.cosmeticPurchase.findUnique({
    where: { userId_requestId: { userId, requestId } },
    select: { cosmeticId: true, priceCoins: true },
  });
  if (existing) {
    const cosmetic = await prisma.cosmetic.findFirst({ where: { id: existing.cosmeticId, slug: cosmeticSlug }, select: { id: true } });
    if (!cosmetic) throw new Error("IDEMPOTENCY_CONFLICT");
    return { duplicate: true, priceCoins: existing.priceCoins };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const cosmetic = await tx.cosmetic.findFirst({ where: { slug: cosmeticSlug, isAvailable: true } });
      if (!cosmetic) throw new Error("COSMETIC_NOT_AVAILABLE");
      const inventory = await tx.inventory.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true } });
      const charged = await tx.user.updateMany({ where: { id: userId, coins: { gte: cosmetic.priceCoins } }, data: { coins: { decrement: cosmetic.priceCoins } } });
      if (charged.count !== 1) throw new Error("INSUFFICIENT_COINS");
      await tx.userCosmetic.upsert({
        where: { inventoryId_cosmeticId: { inventoryId: inventory.id, cosmeticId: cosmetic.id } },
        update: { quantity: { increment: 1 } },
        create: { userId, inventoryId: inventory.id, cosmeticId: cosmetic.id },
      });
      await tx.cosmeticPurchase.create({ data: { requestId, userId, inventoryId: inventory.id, cosmeticId: cosmetic.id, priceCoins: cosmetic.priceCoins } });
      return { duplicate: false, priceCoins: cosmetic.priceCoins };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const replay = await prisma.cosmeticPurchase.findUnique({ where: { userId_requestId: { userId, requestId } }, select: { cosmeticId: true, priceCoins: true } });
    if (!replay) throw error;
    const sameCosmetic = await prisma.cosmetic.findFirst({ where: { id: replay.cosmeticId, slug: cosmeticSlug }, select: { id: true } });
    if (!sameCosmetic) throw new Error("IDEMPOTENCY_CONFLICT");
    return { duplicate: true, priceCoins: replay.priceCoins };
  }
}

export async function startEggIncubationForUser(userId: string, eggId: string) {
  const result = await prisma.userEgg.updateMany({
    where: { id: eggId, userId, status: "AVAILABLE" },
    data: { status: "INCUBATING", incubationStartedAt: new Date() },
  });
  if (result.count !== 1) throw new Error("EGG_NOT_AVAILABLE");
}

export async function applyAcademicPetProgress(tx: Transaction, userId: string, academicXp: number, now = new Date()) {
  if (!Number.isInteger(academicXp) || academicXp < 0) throw new Error("INVALID_XP");
  if (academicXp === 0) return { petId: null, incubatedEggs: 0, leveledUp: false, evolved: false };

  const [activePet, incubatingEggs] = await Promise.all([
    tx.userPet.findFirst({ where: { userId, isActive: true, status: "PRESENT" }, select: { id: true, speciesId: true, xp: true, level: true, happiness: true, evolutionId: true } }),
    tx.userEgg.findMany({ where: { userId, status: "INCUBATING" }, select: { id: true, incubationXp: true, incubationRequiredXp: true } }),
  ]);

  await Promise.all(incubatingEggs.map((egg) => tx.userEgg.updateMany({
    where: { id: egg.id, userId, status: "INCUBATING" },
    data: { incubationXp: Math.min(egg.incubationRequiredXp, egg.incubationXp + academicXp) },
  })));

  if (!activePet) return { petId: null, incubatedEggs: incubatingEggs.length, leveledUp: false, evolved: false };
  const xp = activePet.xp + academicXp;
  const level = levelForXp(xp);
  const evolution = activePet.speciesId
    ? await tx.petEvolution.findFirst({ where: { speciesId: activePet.speciesId, level: { lte: level } }, orderBy: { level: "desc" }, select: { id: true } })
    : null;
  await tx.userPet.updateMany({
    where: { id: activePet.id, userId, isActive: true, status: "PRESENT" },
    data: { xp, level, happiness: Math.min(100, activePet.happiness + PET_RULES.happinessGainPerAcademicAction), evolutionId: evolution?.id ?? null, lastAcademicActivity: now },
  });
  return { petId: activePet.id, incubatedEggs: incubatingEggs.length, leveledUp: level > activePet.level, evolved: evolution?.id !== activePet.evolutionId };
}

export async function hatchEggForUser(userId: string, eggId: string) {
  return prisma.$transaction(async (tx) => {
    const egg = await tx.userEgg.findFirst({
      where: { id: eggId, userId, status: "INCUBATING" },
      include: { eggType: { include: { probabilities: true } }, inventory: true },
    });
    if (!egg || egg.incubationXp < egg.incubationRequiredXp) throw new Error("EGG_NOT_READY");
    const claimed = await tx.userEgg.updateMany({ where: { id: eggId, userId, status: "INCUBATING", incubationXp: { gte: egg.incubationRequiredXp } }, data: { status: "HATCHED", hatchedAt: new Date() } });
    if (claimed.count !== 1) throw new Error("EGG_NOT_READY");

    const rarity = nextRarity(egg.eggType.probabilities);
    const species = await tx.petSpecies.findMany({ where: { isOfficial: true, rarity }, orderBy: { slug: "asc" } });
    if (!species.length) throw new Error("NO_SPECIES_FOR_RARITY");
    const selected = species[randomInt(0, species.length)];
    const duplicate = await tx.userPet.findFirst({ where: { userId, source: "OFFICIAL", speciesId: selected.id }, select: { id: true } });
    if (duplicate) {
      const fragment = await tx.speciesFragment.upsert({
        where: { inventoryId_speciesId: { inventoryId: egg.inventoryId, speciesId: selected.id } },
        update: { quantity: { increment: PET_RULES.duplicateFragments } },
        create: { userId, inventoryId: egg.inventoryId, speciesId: selected.id, quantity: PET_RULES.duplicateFragments },
        select: { quantity: true },
      });
      return { duplicate: true, rarity, speciesName: selected.name, fragmentQuantity: fragment.quantity };
    }

    const evolution = await tx.petEvolution.findFirst({ where: { speciesId: selected.id, level: 1 }, select: { id: true } });
    const active = await tx.userPet.findFirst({ where: { userId, isActive: true, status: "PRESENT" }, select: { id: true } });
    await tx.userPet.create({
      data: {
        userId,
        source: "OFFICIAL",
        name: selected.name,
        speciesId: selected.id,
        rarity,
        evolutionId: evolution?.id,
        isActive: !active,
      },
    });
    return { duplicate: false, rarity, speciesName: selected.name, fragmentQuantity: 0 };
  }, { isolationLevel: "Serializable" });
}

export async function setActivePetForUser(userId: string, petId: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.userPet.findFirst({ where: { id: petId, userId, status: "PRESENT" }, select: { id: true } });
    if (!target) throw new Error("FORBIDDEN");
    await tx.userPet.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
    const activated = await tx.userPet.updateMany({ where: { id: target.id, userId, status: "PRESENT" }, data: { isActive: true } });
    if (activated.count !== 1) throw new Error("FORBIDDEN");
    return { petId: target.id };
  }, { isolationLevel: "Serializable" });
}
