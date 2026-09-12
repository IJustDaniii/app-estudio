import { describe, expect, it } from "vitest";
import { recommendNextTask } from "@/lib/domain/planner";

const now = new Date("2026-09-12T12:00:00.000Z");

describe("recommendNextTask", () => {
  it("prioriza una entrega vencida sin cambiar su fecha", () => {
    const overdue = {
      id: "overdue",
      title: "Entrega pendiente",
      planningMode: "FIXED_DEADLINE" as const,
      priority: "HIGH" as const,
      difficulty: 3,
      dueDate: new Date("2026-09-11T12:00:00.000Z"),
      estimatedMinutes: 45,
      relatedBossDate: null,
    };
    const flexible = {
      ...overdue,
      id: "flexible",
      title: "Repaso flexible",
      planningMode: "FLEXIBLE_STUDY" as const,
      priority: "MEDIUM" as const,
      dueDate: null,
    };

    const recommendation = recommendNextTask([flexible, overdue], now, 60);

    expect(recommendation?.task.id).toBe("overdue");
    expect(overdue.dueDate).toEqual(new Date("2026-09-11T12:00:00.000Z"));
    expect(recommendation?.reasons).toContain("La fecha límite ya ha pasado");
  });

  it("descarta actividades que no caben en el tiempo disponible", () => {
    const tasks = [
      {
        id: "long",
        title: "Proyecto largo",
        planningMode: "FLEXIBLE_STUDY" as const,
        priority: "HIGH" as const,
        difficulty: 5,
        dueDate: null,
        estimatedMinutes: 90,
        relatedBossDate: null,
      },
      {
        id: "short",
        title: "Repaso breve",
        planningMode: "FLEXIBLE_STUDY" as const,
        priority: "LOW" as const,
        difficulty: 2,
        dueDate: null,
        estimatedMinutes: 20,
        relatedBossDate: null,
      },
    ];

    expect(recommendNextTask(tasks, now, 30)?.task.id).toBe("short");
  });
});
