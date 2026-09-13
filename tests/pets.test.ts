import { describe, expect, it } from "vitest";
import {
  applyPetXp,
  createEmptyPetEconomy,
  hatchEgg,
  purchaseEgg,
  setActivePet,
  type PetEconomyState,
} from "@/lib/pets/domain";
import { PET_SHOP_CONFIG } from "@/lib/pets/config";

function stateFor(userId = "user-a", coins = 100): PetEconomyState {
  return createEmptyPetEconomy(userId, coins);
}

describe("dominio de mascotas", () => {
  it("compra un huevo una vez y hace idempotente el mismo requestId", () => {
    const egg = PET_SHOP_CONFIG.eggTypes[0];
    const first = purchaseEgg(stateFor(), { userId: "user-a", requestId: "purchase-1", egg });
    const second = purchaseEgg(first.state, { userId: "user-a", requestId: "purchase-1", egg });

    expect(first.state.coins).toBe(100 - egg.priceCoins);
    expect(first.state.eggs).toHaveLength(1);
    expect(second.duplicate).toBe(true);
    expect(second.state).toEqual(first.state);
  });

  it("rechaza comprar usando la identidad de otro usuario", () => {
    expect(() => purchaseEgg(stateFor(), { userId: "user-b", requestId: "purchase-1", egg: PET_SHOP_CONFIG.eggTypes[0] })).toThrow("FORBIDDEN");
  });

  it("eclosiona un huevo incubado y convierte el duplicado en fragmentos", () => {
    const egg = PET_SHOP_CONFIG.eggTypes[0];
    const purchased = purchaseEgg(stateFor(), { userId: "user-a", requestId: "purchase-1", egg });
    const incubating = {
      ...purchased.state,
      eggs: purchased.state.eggs.map((item) => ({ ...item, status: "INCUBATING" as const, incubationXp: egg.incubationXp })),
    };
    const firstHatch = hatchEgg(incubating, { userId: "user-a", eggId: incubating.eggs[0].id, rarityRoll: 0, speciesRoll: 0 });
    const duplicateHatch = purchaseEgg(firstHatch.state, { userId: "user-a", requestId: "purchase-2", egg });
    const readyAgain = { ...duplicateHatch.state, eggs: duplicateHatch.state.eggs.map((item) => ({ ...item, status: "INCUBATING" as const, incubationXp: egg.incubationXp })) };
    const secondHatch = hatchEgg(readyAgain, { userId: "user-a", eggId: readyAgain.eggs[0].id, rarityRoll: 0, speciesRoll: 0 });

    expect(firstHatch.pet?.speciesSlug).toBe("cat");
    expect(secondHatch.pet).toBeNull();
    expect(secondHatch.fragments).toEqual([{ speciesSlug: "cat", quantity: 1 }]);
  });

  it("mantiene una sola mascota activa y no permite activar la de otro usuario", () => {
    const base = stateFor();
    const withPets: PetEconomyState = {
      ...base,
      pets: [
        { id: "pet-1", userId: "user-a", speciesSlug: "cat", level: 1, xp: 0, happiness: 80, isActive: true },
        { id: "pet-2", userId: "user-a", speciesSlug: "fox", level: 1, xp: 0, happiness: 80, isActive: false },
        { id: "pet-3", userId: "user-b", speciesSlug: "owl", level: 1, xp: 0, happiness: 80, isActive: true },
      ],
    };

    const next = setActivePet(withPets, { userId: "user-a", petId: "pet-2" });

    expect(next.pets.find((pet) => pet.id === "pet-1")?.isActive).toBe(false);
    expect(next.pets.find((pet) => pet.id === "pet-2")?.isActive).toBe(true);
    expect(() => setActivePet(withPets, { userId: "user-a", petId: "pet-3" })).toThrow("FORBIDDEN");
  });

  it("sube nivel y cambia de evolución solo en hitos configurables", () => {
    const pet = { id: "pet-1", userId: "user-a", speciesSlug: "cat", level: 1, xp: 95, happiness: 80, isActive: true };

    const result = applyPetXp(pet, 10);

    expect(result.pet.level).toBe(2);
    expect(result.pet.xp).toBe(105);
    expect(result.evolutionLevel).toBe(1);
    expect(applyPetXp(pet, 900).evolutionLevel).toBe(10);
  });

  it("aísla la progresión y los huevos por userId", () => {
    const userA = stateFor("user-a");
    const userB = stateFor("user-b");
    const purchased = purchaseEgg(userA, { userId: "user-a", requestId: "purchase-1", egg: PET_SHOP_CONFIG.eggTypes[0] });
    expect(() => hatchEgg(userB, { userId: "user-b", eggId: purchased.state.eggs[0].id, rarityRoll: 0, speciesRoll: 0 })).toThrow("FORBIDDEN");
    expect(() => applyPetXp({ id: "pet-1", userId: "user-a", speciesSlug: "cat", level: 1, xp: 0, happiness: 80, isActive: true }, 0, "user-b")).toThrow("FORBIDDEN");
  });
});
