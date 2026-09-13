import { beforeEach, describe, expect, it, vi } from "vitest";

const taskFindMany = vi.hoisted(() => vi.fn());
const gradeFindMany = vi.hoisted(() => vi.fn());
const subjectFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: taskFindMany },
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
