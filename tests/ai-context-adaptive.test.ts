import { describe, expect, it, vi } from "vitest";
import { buildAcademicContext, selectAcademicContextPlan, type AcademicContextRepository } from "@/lib/ai/context";
import { emptyContextSelection, type AIAcademicPermissions } from "@/lib/ai/validation";

const allPermissions: AIAcademicPermissions = {
  canReadGrades: true,
  canReadTasksAndBosses: true,
  canReadSessionsAndStatistics: true,
  canReadSchedule: true,
  canReadMaterials: true,
  canReadGamification: true,
};

function repository(): AcademicContextRepository {
  return {
    subjects: vi.fn(async (userId, ids) => (ids.length ? ids : ["subject-1"]).map((id: string) => ({ id, name: `${userId}-Matemáticas` }))),
    topics: vi.fn(async (_userId, ids) => ids.map((id: string) => ({ id, name: "Derivadas", subjectName: "Matemáticas" }))),
    tasks: vi.fn(async (userId, ids) => (ids.length ? ids : ["task-1"]).map((id: string) => ({ id, title: `${userId}-Ejercicios`, status: "PENDING", dueDate: null, priority: "HIGH", notes: null, subjectName: "Matemáticas" }))),
    bosses: vi.fn(async (_userId, ids) => (ids.length ? ids : ["boss-1"]).map((id: string) => ({ id, title: "Examen de derivadas", date: new Date("2026-10-01T10:00:00Z"), topics: ["Derivadas"], preparation: 20, subjectName: "Matemáticas" }))),
    grades: vi.fn(async (userId, ids) => (ids.length ? ids : ["grade-1"]).map((id: string) => ({ id, label: `${userId}-Parcial`, value: 8, date: new Date("2026-09-01T00:00:00Z"), subjectName: "Matemáticas" }))),
    goals: vi.fn(async (_userId, ids) => ids.map((id: string) => ({ id, title: "Aprobar", progress: 40, targetDate: null, isComplete: false }))),
    studySessions: vi.fn(async (userId, ids) => (ids.length ? ids : ["session-1"]).map((id: string) => ({ id, startedAt: new Date("2026-09-12T17:00:00Z"), actualMinutes: 25, subjectName: `${userId}-Matemáticas`, taskTitle: "Ejercicios" }))),
    schedule: vi.fn(async () => [{ id: "slot-1", dayOfWeek: 1, startTime: "08:00", endTime: "09:00", room: null, subjectName: "Matemáticas" }]),
    calendar: vi.fn(async () => []),
    statistics: vi.fn(async () => ({ periodDays: 14, studyMinutes: 90, sessions: 3, averageSessionMinutes: 30, completedTasks: 2 })),
    gamification: vi.fn(async () => ({ xp: 170, coins: 18, level: 2, currentXp: 70, nextLevelXp: 100, streak: 4, missions: [] })),
    materials: vi.fn(async (_userId, ids) => (ids.length ? ids : ["material-1"]).map((id: string) => ({ id, name: "Apuntes", mimeType: "text/plain", size: 10, storageKey: id }))),
  };
}

describe("selección adaptativa de contexto académico", () => {
  it("prioriza tareas, horario y rendimiento reciente para una pregunta de hoy", () => {
    expect(selectAcademicContextPlan({ message: "¿Qué estudio hoy?", permissions: allPermissions }).categories).toEqual([
      "tasksAndBosses",
      "schedule",
      "sessionsAndStatistics",
    ]);
  });

  it("prioriza asignatura, temas y materiales al mencionar una asignatura", () => {
    expect(selectAcademicContextPlan({ message: "Tengo una duda de Matemáticas sobre derivadas", permissions: allPermissions }).categories).toEqual([
      "subjects",
      "materials",
      "tasksAndBosses",
    ]);
  });

  it("no consulta una categoría cuyo permiso está desactivado", async () => {
    const repo = repository();
    const permissions = { ...allPermissions, canReadGrades: false };
    const result = await buildAcademicContext({
      userId: "user-a",
      isEnabled: true,
      usePersonalContext: true,
      message: "¿Cómo va mi rendimiento y mis notas?",
      maxCharacters: 4_000,
      maxItemsPerCategory: 5,
      selection: emptyContextSelection,
      permissions,
      repository: repo,
      loadMaterial: async () => Buffer.alloc(0),
    });

    expect(repo.grades).not.toHaveBeenCalled();
    expect(result.text).not.toContain("Nota");
    expect(result.snapshot.blocked).toEqual([{ category: "grades", label: "Notas" }]);
  });

  it("usa contexto automático acotado sin consultar categorías irrelevantes", async () => {
    const repo = repository();
    const result = await buildAcademicContext({
      userId: "user-a",
      isEnabled: true,
      usePersonalContext: true,
      message: "¿Qué estudio hoy?",
      maxCharacters: 4_000,
      maxItemsPerCategory: 3,
      selection: emptyContextSelection,
      permissions: allPermissions,
      repository: repo,
      loadMaterial: async () => Buffer.alloc(0),
    });

    expect(result.text).toContain("Ejercicios");
    expect(result.text).toContain("Sesiones y estadísticas");
    expect(repo.materials).not.toHaveBeenCalled();
    expect(repo.tasks).toHaveBeenCalledWith("user-a", [], expect.objectContaining({ limit: 3 }));
    expect(result.snapshot.used.map((item) => item.category)).toEqual([
      "tasksAndBosses",
      "schedule",
      "sessionsAndStatistics",
    ]);
  });

  it("permite el chat sin contexto personal aunque la pregunta pida datos académicos", async () => {
    const repo = repository();
    const result = await buildAcademicContext({
      userId: "user-a",
      isEnabled: true,
      usePersonalContext: false,
      message: "¿Qué estudio hoy?",
      maxCharacters: 4_000,
      selection: { ...emptyContextSelection, taskIds: ["task-1"] },
      permissions: allPermissions,
      repository: repo,
      loadMaterial: async () => Buffer.alloc(0),
    });

    expect(result.text).toBe("");
    expect(result.snapshot.mode).toBe("none");
    expect(repo.tasks).not.toHaveBeenCalled();
  });
});
