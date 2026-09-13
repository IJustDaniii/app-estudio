import { describe, expect, it } from "vitest";
import {
  calculateRequiredGrade,
  calculateWeightedAverage,
  canRescheduleTask,
  gradeEvolution,
  gradeDifference,
  type AcademicGrade,
  type ReschedulableTask,
} from "@/lib/domain/academic-rules";

describe("reglas del nucleo academico", () => {
  it("impide cambiar la fecha de una obligacion fija vencida", () => {
    const task: ReschedulableTask = {
      planningMode: "FIXED_DEADLINE",
      dueDate: new Date("2026-09-10T10:00:00.000Z"),
    };

    expect(canRescheduleTask(task, new Date("2026-09-12T10:00:00.000Z"), new Date("2026-09-13T10:00:00.000Z"))).toEqual({
      allowed: false,
      reason: "OVERDUE_FIXED_DEADLINE",
    });
  });

  it("permite cambiar la fecha del estudio flexible aunque ya haya pasado", () => {
    const task: ReschedulableTask = {
      planningMode: "FLEXIBLE_STUDY",
      dueDate: new Date("2026-09-10T10:00:00.000Z"),
    };

    expect(canRescheduleTask(task, new Date("2026-09-12T10:00:00.000Z"), new Date("2026-09-13T10:00:00.000Z"))).toEqual({ allowed: true });
  });

  it("calcula media ponderada y su evolucion", () => {
    const grades: AcademicGrade[] = [
      { value: 5, weight: 1, date: new Date("2026-09-01") },
      { value: 8, weight: 2, date: new Date("2026-09-10") },
    ];

    expect(calculateWeightedAverage(grades)).toBeCloseTo(7, 5);
    expect(gradeEvolution(grades).map((point) => point.average)).toEqual([5, 7]);
  });

  it("calcula la nota necesaria y compara la esperada con la real", () => {
    expect(calculateRequiredGrade({ target: 7, currentWeightedSum: 12, currentWeight: 2, nextWeight: 1 })).toBe(9);
    expect(calculateRequiredGrade({ target: 9, currentWeightedSum: 12, currentWeight: 2, nextWeight: 1 })).toBe(15);
    expect(gradeDifference(7.5, 6.25)).toEqual({ value: -1.25, label: "Por debajo de lo esperado" });
    expect(gradeDifference(7.5, 8)).toEqual({ value: 0.5, label: "Por encima de lo esperado" });
  });
});
