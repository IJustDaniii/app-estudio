import { describe, expect, it, vi } from "vitest";
import { buildAcademicContext, selectAcademicContextPlan, type AcademicContextRepository } from "@/lib/ai/context";
import { toolDefinitionsForPermissions } from "@/lib/ai/tools";
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
    tasks: vi.fn(async (userId, ids) => (ids.length ? ids : ["task-1"]).map((id: string) => ({ id, title: `${userId}-Ejercicios-${id}`, planningMode: "FIXED_DEADLINE", type: "Entrega", status: "PENDING", dueDate: new Date("2026-09-13T20:00:00Z"), priority: "HIGH", difficulty: 4, estimatedMinutes: 50, notes: "Repasar antes de entregar", completedAt: null, subjectName: "Matemáticas" }))),
    bosses: vi.fn(async (_userId, ids) => (ids.length ? ids : ["boss-1"]).map((id: string) => ({ id, title: `Examen de derivadas ${id}`, date: new Date("2026-10-01T10:00:00Z"), topics: ["Derivadas"], difficulty: 4, preparation: 20, targetGrade: 8.5, expectedGrade: 7.5, actualGrade: null, subjectName: "Matemáticas" }))),
    grades: vi.fn(async (userId, ids) => (ids.length ? ids : ["grade-1"]).map((id: string) => ({ id, label: `${userId}-Parcial`, value: 8, date: new Date("2026-09-01T00:00:00Z"), subjectName: "Matemáticas" }))),
    goals: vi.fn(async (_userId, ids) => ids.map((id: string) => ({ id, title: "Aprobar", progress: 40, targetDate: null, isComplete: false }))),
    studySessions: vi.fn(async (userId, ids) => (ids.length ? ids : ["session-1"]).map((id: string) => ({ id, startedAt: new Date("2026-09-12T17:00:00Z"), actualMinutes: 25, subjectName: `${userId}-Matemáticas`, taskTitle: "Ejercicios" }))),
    schedule: vi.fn(async () => [{ id: "slot-1", dayOfWeek: 1, startTime: "08:00", endTime: "09:00", room: null, subjectName: "Matemáticas" }]),
    calendar: vi.fn(async () => []),
    statistics: vi.fn(async () => ({ periodDays: 14, studyMinutes: 90, sessions: 3, averageSessionMinutes: 30, completedTasks: 2 })),
    gamification: vi.fn(async () => ({ xp: 170, coins: 18, level: 2, currentXp: 70, nextLevelXp: 100, streak: 4, missions: [] })),
    materials: vi.fn(async (_userId, ids) => (ids.length ? ids : ["material-1"]).map((id: string) => ({ id, name: `Apuntes ${id}`, mimeType: "text/plain", size: 10, description: "Resumen", type: "NOTES", processingStatus: "PROCESSED", subjectName: "Matemáticas", topicName: "Derivadas", storageKey: id }))),
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

  it("prioriza asignatura y materiales sin consultar planificación irrelevante", () => {
    expect(selectAcademicContextPlan({ message: "Tengo una duda de Matemáticas sobre derivadas", permissions: allPermissions }).categories).toEqual([
      "subjects",
      "materials",
    ]);
  });

  it.each([
    ["¿Qué tareas pendientes tengo?", ["tasksAndBosses"]],
    ["¿Qué exámenes tengo próximamente?", ["tasksAndBosses"]],
    ["¿Qué objetivos y metas tengo?", ["tasksAndBosses"]],
    ["¿Cuántas sesiones he hecho?", ["sessionsAndStatistics"]],
    ["¿Qué materiales tengo?", ["materials"]],
    ["¿Cuál es mi horario de esta semana?", ["schedule"]],
    ["¿Cómo voy con mis notas?", ["grades", "sessionsAndStatistics"]],
    ["¿Cuánta XP y qué misiones tengo?", ["gamification"]],
  ] as const)("reconoce %s y mantiene solo sus categorías", (message, categories) => {
    const plan = selectAcademicContextPlan({ message, permissions: allPermissions });
    expect(plan.categories).toEqual(categories);
    const allowedCategories = new Set<string>(categories);
    expect(toolDefinitionsForPermissions(allPermissions, plan.categories).every((tool) => {
      const category = tool.name === "consult_grades" ? "grades" : tool.name === "consult_statistics" || tool.name === "consult_study_sessions" ? "sessionsAndStatistics" : tool.name === "consult_schedule" || tool.name === "consult_calendar" ? "schedule" : tool.name === "consult_gamification" ? "gamification" : tool.name === "consult_materials" ? "materials" : tool.name === "consult_subjects" || tool.name === "consult_topics" ? "subjects" : "tasksAndBosses";
      return allowedCategories.has(category);
    })).toBe(true);
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

  it("habilita solo las herramientas de la necesidad detectada", () => {
    const goalsPlan = selectAcademicContextPlan({ message: "¿Qué objetivos tengo?", permissions: allPermissions });
    const sessionsPlan = selectAcademicContextPlan({ message: "¿Qué sesiones he hecho?", permissions: allPermissions });
    expect(toolDefinitionsForPermissions(allPermissions, goalsPlan.categories, goalsPlan.toolNames).map((tool) => tool.name)).toEqual(["consult_goals"]);
    expect(toolDefinitionsForPermissions(allPermissions, sessionsPlan.categories, sessionsPlan.toolNames).map((tool) => tool.name)).toEqual(["consult_study_sessions", "consult_statistics"]);
  });

  it("no amplía una selección manual a elementos relacionados no seleccionados", async () => {
    const repo = repository();
    const subjectSelection = { ...emptyContextSelection, subjectIds: ["subject-1"] };
    const plan = selectAcademicContextPlan({ message: "", selection: subjectSelection, permissions: allPermissions });
    expect(plan.toolNames).toEqual(["consult_subjects"]);

    await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "", maxCharacters: 4_000, selection: subjectSelection, permissions: allPermissions, repository: repo, loadMaterial: async () => Buffer.alloc(0) });
    expect(repo.topics).not.toHaveBeenCalled();
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

  it("usa el día local completo para tareas y eventos de hoy", async () => {
    const repo = repository();
    const now = new Date("2026-09-13T01:00:00.000Z");
    await buildAcademicContext({
      userId: "user-a",
      isEnabled: true,
      message: "¿Qué estudio hoy?",
      maxCharacters: 4_000,
      selection: emptyContextSelection,
      permissions: allPermissions,
      timeZone: "Europe/Madrid",
      now,
      repository: repo,
      loadMaterial: async () => Buffer.alloc(0),
    });

    expect(repo.tasks).toHaveBeenCalledWith("user-a", [], expect.objectContaining({
      from: new Date("2026-09-12T22:00:00.000Z"),
      to: new Date("2026-09-27T22:00:00.000Z"),
      onlyOpen: true,
    }));
    expect(repo.calendar).toHaveBeenCalledWith("user-a", expect.objectContaining({
      from: new Date("2026-09-12T22:00:00.000Z"),
      to: new Date("2026-09-27T22:00:00.000Z"),
    }));
  });

  it("serializa todos los campos de tareas y Bosses y respeta selecciones manuales", async () => {
    const repo = repository();
    const result = await buildAcademicContext({
      userId: "user-a",
      isEnabled: true,
      message: "",
      maxCharacters: 8_000,
      selection: { ...emptyContextSelection, taskIds: ["task-1"], bossIds: ["boss-1"] },
      permissions: allPermissions,
      repository: repo,
      loadMaterial: async () => Buffer.alloc(0),
    });

    expect(result.text).toContain("planificación=FIXED_DEADLINE");
    expect(result.text).toContain("tipo=Entrega");
    expect(result.text).toContain("prioridad=HIGH");
    expect(result.text).toContain("dificultad=4/5");
    expect(result.text).toContain("duración=50 min");
    expect(result.text).toContain("notas=Repasar antes de entregar");
    expect(result.text).toContain("nota objetivo=8.5");
    expect(result.text).toContain("nota esperada=7.5");
    expect(result.text).toContain("nota real=sin nota");
    expect(repo.tasks).toHaveBeenCalledWith("user-a", ["task-1"], expect.objectContaining({ subjectIds: undefined }));
    expect(repo.bosses).toHaveBeenCalledWith("user-a", ["boss-1"], expect.objectContaining({ subjectIds: undefined }));
  });

  it("consulta solo metadatos de materiales salvo que se pida analizarlos", async () => {
    const repo = repository();
    const loadMaterial = vi.fn(async () => Buffer.from("Contenido privado"));
    await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "¿Qué materiales tengo?", maxCharacters: 4_000, selection: emptyContextSelection, permissions: allPermissions, repository: repo, loadMaterial });
    expect(loadMaterial).not.toHaveBeenCalled();
    expect(repo.tasks).not.toHaveBeenCalled();
    expect(repo.bosses).not.toHaveBeenCalled();
    expect(repo.materials).toHaveBeenCalled();

    await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "Analiza mis apuntes", maxCharacters: 4_000, selection: emptyContextSelection, permissions: allPermissions, repository: repo, loadMaterial });
    expect(loadMaterial).toHaveBeenCalled();
  });

  it("no carga un material que ya supera el límite de análisis", async () => {
    const repo = repository();
    repo.materials = vi.fn(async () => [{ id: "large", name: "Libro grande", mimeType: "application/pdf", size: 10 * 1024 * 1024 + 1, description: null, type: "THEORY", processingStatus: "PROCESSED", subjectName: null, topicName: null, storageKey: "large" }]);
    const loadMaterial = vi.fn(async () => Buffer.from("no debe leerse"));

    const result = await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "Analiza mis materiales", maxCharacters: 4_000, selection: { ...emptyContextSelection, materialIds: ["large"] }, permissions: allPermissions, repository: repo, loadMaterial });

    expect(loadMaterial).not.toHaveBeenCalled();
    expect(result.warnings).toContain("Libro grande: AI_MATERIAL_TOO_LARGE");
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
