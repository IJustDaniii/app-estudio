import { beforeEach, describe, expect, it, vi } from "vitest";

const taskFindMany = vi.hoisted(() => vi.fn());
const bossFindMany = vi.hoisted(() => vi.fn());
const gradeFindMany = vi.hoisted(() => vi.fn());
const subjectFindMany = vi.hoisted(() => vi.fn());
const timetableFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: taskFindMany },
    boss: { findMany: bossFindMany },
    grade: { findMany: gradeFindMany },
    subject: { findMany: subjectFindMany },
    timetableEntry: { findMany: timetableFindMany },
  },
}));

const { scopedReadOnlyToolRepository } = await import("@/lib/ai/repository");
const { emptyContextSelection } = await import("@/lib/ai/validation");

describe("repositorio de contexto académico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    timetableFindMany.mockResolvedValue([]);
  });

  it("mantiene el userId en cada consulta de herramienta", async () => {
    taskFindMany.mockResolvedValue([]);
    const repository = scopedReadOnlyToolRepository(emptyContextSelection);
    await repository.tasks("user-a", { limit: 5 });

    expect(taskFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "user-a" }) }));
  });

  it("no incluye tareas ni Bosses pasados cuando la herramienta pide próximos elementos", async () => {
    taskFindMany.mockResolvedValue([]);
    bossFindMany.mockResolvedValue([]);
    const now = new Date("2026-09-13T10:00:00.000Z");
    const repository = scopedReadOnlyToolRepository(emptyContextSelection, undefined, 20, [], "Europe/Madrid", now);
    await repository.tasks("user-a", { limit: 5 });
    await repository.bosses("user-a", { limit: 5 });

    expect(taskFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ dueDate: expect.objectContaining({ gte: now }) }) }));
    expect(bossFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ date: expect.objectContaining({ gte: now }) }) }));
  });

  it("separa la búsqueda textual del rango temporal", async () => {
    taskFindMany.mockResolvedValue([]);
    const now = new Date("2026-09-13T10:00:00.000Z");
    const repository = scopedReadOnlyToolRepository(emptyContextSelection, undefined, 20, [], "Europe/Madrid", now);

    await repository.tasks("user-a", { query: "matemáticas", limit: 5 });
    expect(taskFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.not.objectContaining({ dueDate: expect.anything() }) }));

    await repository.tasks("user-a", { query: "matemáticas", timeRange: "week", limit: 5 });
    expect(taskFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ dueDate: expect.objectContaining({ gte: expect.any(Date), lt: expect.any(Date) }) }) }));
  });

  it("aplica el rango mensual a las notas", async () => {
    gradeFindMany.mockResolvedValue([]);
    const now = new Date("2026-09-13T10:00:00.000Z");
    const repository = scopedReadOnlyToolRepository(emptyContextSelection, undefined, 20, [], "Europe/Madrid", now);

    await repository.grades("user-a", { query: "notas", timeRange: "month", limit: 5 });

    expect(gradeFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ date: { gte: new Date("2026-08-31T22:00:00.000Z"), lt: new Date("2026-09-30T22:00:00.000Z") } }) }));
  });

  it("mantiene completo el rango diario o reciente solicitado por la herramienta", async () => {
    taskFindMany.mockResolvedValue([]);
    const now = new Date("2026-09-13T10:00:00.000Z");
    const repository = scopedReadOnlyToolRepository(emptyContextSelection, undefined, 20, [], "Europe/Madrid", now);

    await repository.tasks("user-a", { query: "tareas", timeRange: "today", limit: 5 });
    expect(taskFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ dueDate: { gte: new Date("2026-09-12T22:00:00.000Z"), lt: new Date("2026-09-13T22:00:00.000Z") } }) }));

    await repository.tasks("user-a", { query: "tareas", timeRange: "recent", limit: 5 });
    expect(taskFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ dueDate: { gte: new Date("2026-08-29T22:00:00.000Z"), lt: now } }) }));
  });

  it("filtra el horario diario sin convertir una vista semanal en un solo día", async () => {
    const now = new Date("2026-09-13T10:00:00.000Z");
    const repository = scopedReadOnlyToolRepository(emptyContextSelection, undefined, 20, [], "Europe/Madrid", now);

    await repository.schedule?.("user-a", { query: "horario de hoy", limit: 5 });
    expect(timetableFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "user-a", dayOfWeek: 7 }) }));
    await repository.schedule?.("user-a", { query: "horario de esta semana", limit: 5 });
    expect(timetableFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.not.objectContaining({ dayOfWeek: expect.anything() }) }));
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
