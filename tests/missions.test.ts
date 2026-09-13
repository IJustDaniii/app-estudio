import { describe, expect, it } from "vitest";
import { updateMissionProgress } from "@/lib/domain/missions";

describe("recompensas de misiones diarias", () => {
  it("marca una misión recién alcanzada y solicita una sola recompensa", () => {
    expect(updateMissionProgress({ target: 30, progress: 20, isComplete: false }, 30)).toEqual({ progress: 30, isComplete: true, shouldReward: true });
  });

  it("no solicita recompensa mientras la misión siga incompleta", () => {
    expect(updateMissionProgress({ target: 30, progress: 0, isComplete: false }, 29)).toEqual({ progress: 29, isComplete: false, shouldReward: false });
  });

  it("no vuelve a solicitar recompensa para una misión ya completada", () => {
    expect(updateMissionProgress({ target: 30, progress: 30, isComplete: true }, 45)).toEqual({ progress: 45, isComplete: true, shouldReward: false });
  });

  it("normaliza progreso negativo o decimal antes de decidir", () => {
    expect(updateMissionProgress({ target: 2, progress: 0, isComplete: false }, -1.7)).toEqual({ progress: 0, isComplete: false, shouldReward: false });
  });
});
