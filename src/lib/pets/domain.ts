import { PET_RARITIES, PET_RULES, PET_SHOP_CONFIG, PET_SPECIES_CONFIG, type PetRarity } from "@/lib/pets/config";

export type OwnedEggState = { id: string; userId: string; status: "AVAILABLE" | "INCUBATING" | "HATCHED"; incubationXp: number; incubationRequiredXp: number; eggSlug: string };
export type OwnedPetState = { id: string; userId: string; speciesSlug: string; level: number; xp: number; happiness: number; isActive: boolean };
export type SpeciesFragmentState = { speciesSlug: string; quantity: number };
export type PetEconomyState = {
  userId: string;
  coins: number;
  eggs: OwnedEggState[];
  pets: OwnedPetState[];
  fragments: SpeciesFragmentState[];
  purchases: { requestId: string; eggId: string }[];
};

export function createEmptyPetEconomy(userId: string, coins = 0): PetEconomyState {
  return { userId, coins, eggs: [], pets: [], fragments: [], purchases: [] };
}

function assertUser(state: PetEconomyState, userId: string) {
  if (state.userId !== userId) throw new Error("FORBIDDEN");
}

export function purchaseEgg(state: PetEconomyState, input: { userId: string; requestId: string; egg: (typeof PET_SHOP_CONFIG.eggTypes)[number] }) {
  assertUser(state, input.userId);
  const previous = state.purchases.find((purchase) => purchase.requestId === input.requestId);
  if (previous) return { state, eggId: previous.eggId, duplicate: true as const };
  if (state.coins < input.egg.priceCoins) throw new Error("INSUFFICIENT_COINS");
  const eggId = "egg-" + (state.eggs.length + 1);
  return {
    duplicate: false as const,
    eggId,
    state: {
      ...state,
      coins: state.coins - input.egg.priceCoins,
      eggs: [...state.eggs, { id: eggId, userId: input.userId, status: "AVAILABLE" as const, incubationXp: 0, incubationRequiredXp: input.egg.incubationXp, eggSlug: input.egg.slug }],
      purchases: [...state.purchases, { requestId: input.requestId, eggId }],
    },
  };
}

function rarityForRoll(probabilities: Record<PetRarity, number>, roll: number): PetRarity {
  if (!Number.isInteger(roll) || roll < 0 || roll >= 10_000) throw new Error("INVALID_ROLL");
  let cursor = 0;
  for (const rarity of PET_RARITIES) {
    cursor += probabilities[rarity];
    if (roll < cursor) return rarity;
  }
  throw new Error("INVALID_PROBABILITIES");
}

export function hatchEgg(state: PetEconomyState, input: { userId: string; eggId: string; rarityRoll: number; speciesRoll: number }) {
  assertUser(state, input.userId);
  const egg = state.eggs.find((item) => item.id === input.eggId);
  if (!egg || egg.userId !== input.userId) throw new Error("FORBIDDEN");
  if (egg.status !== "INCUBATING") throw new Error("EGG_NOT_READY");
  if (egg.incubationXp < egg.incubationRequiredXp) throw new Error("EGG_NOT_READY");
  if (!Number.isInteger(input.speciesRoll) || input.speciesRoll < 0) throw new Error("INVALID_ROLL");

  const eggConfig = PET_SHOP_CONFIG.eggTypes.find((item) => item.slug === egg.eggSlug);
  if (!eggConfig) throw new Error("UNKNOWN_EGG");
  const rarity = rarityForRoll(eggConfig.probabilities, input.rarityRoll);
  const species = PET_SPECIES_CONFIG.filter((item) => item.rarity === rarity);
  if (!species.length) throw new Error("NO_SPECIES_FOR_RARITY");
  const selected = species[input.speciesRoll % species.length];
  const nextEggs = state.eggs.map((item) => item.id === egg.id ? { ...item, status: "HATCHED" as const } : item);
  const duplicate = state.pets.some((pet) => pet.userId === input.userId && pet.speciesSlug === selected.slug);
  if (duplicate) {
    const existing = state.fragments.find((fragment) => fragment.speciesSlug === selected.slug);
    const fragments = existing
      ? state.fragments.map((fragment) => fragment.speciesSlug === selected.slug ? { ...fragment, quantity: fragment.quantity + PET_RULES.duplicateFragments } : fragment)
      : [...state.fragments, { speciesSlug: selected.slug, quantity: PET_RULES.duplicateFragments }];
    return { state: { ...state, eggs: nextEggs, fragments }, pet: null, rarity, fragments };
  }

  const pet = { id: "pet-" + (state.pets.length + 1), userId: input.userId, speciesSlug: selected.slug, level: 1, xp: 0, happiness: PET_RULES.defaultHappiness, isActive: !state.pets.some((item) => item.userId === input.userId && item.isActive) };
  return { state: { ...state, eggs: nextEggs, pets: [...state.pets, pet] }, pet, rarity, fragments: state.fragments };
}

export function evolutionLevelForPet(level: number) {
  return [...PET_RULES.evolutionLevels].reverse().find((threshold) => threshold <= level) ?? PET_RULES.evolutionLevels[0];
}

export function applyPetXp(pet: OwnedPetState, xp: number, userId = pet.userId) {
  if (pet.userId !== userId) throw new Error("FORBIDDEN");
  if (!Number.isInteger(xp) || xp < 0) throw new Error("INVALID_XP");
  const totalXp = pet.xp + xp;
  const level = Math.floor(totalXp / PET_RULES.xpPerLevel) + 1;
  return {
    pet: { ...pet, xp: totalXp, level, happiness: Math.min(100, pet.happiness + (xp > 0 ? PET_RULES.happinessGainPerAcademicAction : 0)) },
    evolutionLevel: evolutionLevelForPet(level),
    leveledUp: level > pet.level,
  };
}

export function setActivePet(state: PetEconomyState, input: { userId: string; petId: string }) {
  assertUser(state, input.userId);
  const target = state.pets.find((pet) => pet.id === input.petId && pet.userId === input.userId);
  if (!target) throw new Error("FORBIDDEN");
  return { ...state, pets: state.pets.map((pet) => pet.userId === input.userId ? { ...pet, isActive: pet.id === input.petId } : pet) };
}
