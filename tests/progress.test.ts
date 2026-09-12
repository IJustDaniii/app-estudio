import { describe, expect, it } from "vitest";
import { calculateLevel, rewardsForStudyMinutes } from "@/lib/domain/progress";

describe("progreso provisional", () => {
  it("calcula nivel y progreso con umbrales centralizados", () => {
    expect(calculateLevel(0)).toEqual({ level: 1, currentXp: 0, nextLevelXp: 100 });
    expect(calculateLevel(150)).toEqual({ level: 2, currentXp: 50, nextLevelXp: 100 });
  });

  it("asigna recompensas lineales provisionales por estudio", () => {
    expect(rewardsForStudyMinutes(50)).toEqual({ xp: 50, coins: 5 });
  });
});
