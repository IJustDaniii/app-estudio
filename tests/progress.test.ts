import { describe, expect, it } from "vitest";
import { calculateLevel, rewardsForStudyMinutes, taskCompletionReward } from "@/lib/domain/progress";

describe("progreso provisional", () => {
  it("calcula nivel y progreso con umbrales centralizados", () => {
    expect(calculateLevel(0)).toEqual({ level: 1, currentXp: 0, nextLevelXp: 100 });
    expect(calculateLevel(150)).toEqual({ level: 2, currentXp: 50, nextLevelXp: 100 });
  });

  it("asigna recompensas lineales provisionales por estudio", () => {
    expect(rewardsForStudyMinutes(50)).toEqual({ xp: 50, coins: 5 });
  });

  it("respeta los límites de bloques de monedas", () => {
    expect(rewardsForStudyMinutes(0)).toEqual({ xp: 0, coins: 0 });
    expect(rewardsForStudyMinutes(9)).toEqual({ xp: 9, coins: 0 });
    expect(rewardsForStudyMinutes(10)).toEqual({ xp: 10, coins: 1 });
  });

  it("mantiene centralizada la recompensa de la primera finalización de una tarea", () => {
    expect(taskCompletionReward()).toEqual({ xp: 20, coins: 2 });
  });
});
