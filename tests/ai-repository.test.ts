import { beforeEach, describe, expect, it, vi } from "vitest";

const taskFindMany = vi.hoisted(() => vi.fn());
const bossFindMany = vi.hoisted(() => vi.fn());
const gradeFindMany = vi.hoisted(() => vi.fn());
const subjectFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: taskFindMany },
    boss: { findMany: bossFindMany },
    grade: { findMany: gradeFindMany },
    subject: { findMany: subjectFindMany },
  },
}));

const { scopedReadOnlyToolRepository } = await import("@/lib/ai/repository");
const { emptyContextSelection } = await import("@/lib/ai/validation");

describe("repositorio de contexto académico", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mantiene el userId en cada consulta de herramienta", async () => {
    taskFindMany.mockResolvedValue([]);
    const repository = scopedReadOnlyToolRepository(emptyContextSelection);
    await repository.tasks("user-a", { limit: 5 });

    expect(taskFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "user-a" }) }));
  });

  it("serializa la misma forma completa que el contexto adaptativo", async () => {
    taskFindMany.mockResolvedValue([{
      id: "task-a",
      title: "Entrega",
      planningMode: "FIXED_DEADLINE",
      type: "PROJECT",
      priority: "HIGH",
      difficulty: 4,
      dueDate: new Date("2026-09-13T20:00:00.000Z"),
      estimatedMinutes: 45,
      status: "PENDING",
      notes: "Repasar",
      completedAt: null,
      subject: { name: "Matemáticas" },
    }]);
    const repository = scopedReadOnlyToolRepository(emptyContextSelection, undefined, 20, [], "Europe/Madrid");

    await expect(repository.tasks("user-a", { limit: 5 })).resolves.toEqual([expect.objectContaining({
      id: "task-a",
      planningMode: "FIXED_DEADLINE",
      type: "PROJECT",
      priority: "HIGH",
      difficulty: 4,
      estimatedMinutes: 45,
      notes: "Repasar",
      completedAt: null,
      dueDate: { iso: "2026-09-13T20:00:00.000Z", local: expect.stringContaining("2026-09-13"), timeZone: "Europe/Madrid" },
    })]);
  });

  it("no toca Prisma para una categoría cuyo permiso está revocado", async () => {
    const repository = scopedReadOnlyToolRepository(emptyContextSelection, {
      canReadGrades: false,
      canReadTasksAndBosses: true,
      canReadSessionsAndStatistics: true,
      canReadSchedule: true,
      canReadMaterials: true,
      canReadGamification: true,
    });
    await repository.grades("user-a", { limit: 5 });

    expect(gradeFindMany).not.toHaveBeenCalled();
  });
});
