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
    expect(selectAcademicContextPlan({ message: "¿Qué estudio hoy?", permissions: allPermissions }).categories).toEqual(expect.arrayContaining([
      "tasksAndBosses", "schedule", "sessionsAndStatistics",
    ]));
  });

  it("prioriza asignatura y materiales sin consultar planificación irrelevante", () => {
    expect(selectAcademicContextPlan({ message: "Tengo una duda de Matemáticas sobre derivadas", permissions: allPermissions }).categories).toEqual(expect.arrayContaining([
      "subjects", "materials",
    ]));
  });

  it.each([
    ["¿Cuál es mi progreso?", ["grades", "sessionsAndStatistics"]],
    ["¿Cómo voy?", ["grades", "sessionsAndStatistics"]],
    ["Ayúdame a organizarme esta semana", ["tasksAndBosses", "schedule", "sessionsAndStatistics"]],
    ["¿Qué puedo hacer próximamente?", ["tasksAndBosses", "schedule", "sessionsAndStatistics"]],
  ] as const)("detecta frases personales naturales: %s", (message, categories) => {
    const plan = selectAcademicContextPlan({ message, permissions: allPermissions });
    expect(plan.categories).toEqual(expect.arrayContaining([...categories]));
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
    expect(plan.categories).toEqual(expect.arrayContaining([...categories]));
    expect(toolDefinitionsForPermissions(allPermissions, plan.categories).length).toBeGreaterThan(0);
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

  it("continúa con el resto del contexto cuando una categoría falla", async () => {
    const repo = repository();
    repo.grades = vi.fn(async () => { throw new Error("base de datos temporalmente no disponible"); });
    const result = await buildAcademicContext({
      userId: "user-a", isEnabled: true, message: "¿Cómo va mi rendimiento?", maxCharacters: 8_000,
      selection: emptyContextSelection, permissions: allPermissions, repository: repo, loadMaterial: async () => Buffer.alloc(0),
    });

    expect(result.text).toContain("Ejercicios");
    expect(result.warnings).toContain("Notas: datos no disponibles temporalmente.");
  });

  it("consulta solo las categorías necesarias para una pregunta concreta", async () => {
    const repo = repository();
    await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "¿Qué estudio hoy?", maxCharacters: 8_000, selection: emptyContextSelection, permissions: allPermissions, repository: repo, loadMaterial: async () => Buffer.alloc(0) });
    expect(repo.tasks).toHaveBeenCalled();
    expect(repo.schedule).toHaveBeenCalled();
    expect(repo.subjects).not.toHaveBeenCalled();
    expect(repo.grades).not.toHaveBeenCalled();
    expect(repo.materials).not.toHaveBeenCalled();
    expect(repo.gamification).not.toHaveBeenCalled();
  });

  it("resume todas las categorías autorizadas para una pregunta amplia", async () => {
    const repo = repository();
    await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "¿Qué sabes de mí?", maxCharacters: 8_000, selection: emptyContextSelection, permissions: allPermissions, repository: repo, loadMaterial: async () => Buffer.alloc(0) });
    expect(repo.subjects).toHaveBeenCalledTimes(1);
    expect(repo.tasks).toHaveBeenCalled();
    expect(repo.grades).toHaveBeenCalled();
    expect(repo.materials).toHaveBeenCalled();
    expect(repo.gamification).toHaveBeenCalled();
  });

  it("usa un fallback personal seguro para preguntas ambiguas", async () => {
    const repo = repository();
    const plan = selectAcademicContextPlan({ message: "¿Qué puedo mejorar de lo mío?", permissions: allPermissions });
    const result = await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "¿Qué puedo mejorar de lo mío?", maxCharacters: 8_000, selection: emptyContextSelection, permissions: allPermissions, repository: repo, loadMaterial: async () => Buffer.alloc(0) });

    expect(plan.intent).toBe("personal");
    expect(plan.categories).toEqual(expect.arrayContaining(["tasksAndBosses", "grades", "sessionsAndStatistics"]));
    expect(result.snapshot.mode).toBe("personal");
    expect(result.text).toContain("Ejercicios");
  });

  it("no duplica la consulta de asignaturas al resolver una duda personal", async () => {
    const repo = repository();
    await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "Tengo una duda de Matemáticas sobre derivadas", maxCharacters: 8_000, selection: emptyContextSelection, permissions: allPermissions, repository: repo, loadMaterial: async () => Buffer.alloc(0) });
    expect(repo.subjects).toHaveBeenCalledTimes(1);
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
    expect(repo.topics).toHaveBeenCalledWith("user-a", [], expect.objectContaining({ subjectIds: ["subject-1"] }));
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
    expect(result.snapshot.used.map((item) => item.category)).toEqual(expect.arrayContaining([
      "tasksAndBosses", "schedule", "sessionsAndStatistics",
    ]));
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
      to: new Date("2026-09-13T22:00:00.000Z"),
      onlyOpen: true,
    }));
    expect(repo.calendar).toHaveBeenCalledWith("user-a", expect.objectContaining({
      from: now,
      to: new Date("2026-09-13T22:00:00.000Z"),
    }));
  });

  it("aplica from/to a las notas y el día local al horario diario", async () => {
    const repo = repository();
    const now = new Date("2026-09-13T01:00:00.000Z");
    await buildAcademicContext({
      userId: "user-a", isEnabled: true, message: "¿Cómo van mis notas esta semana y cuál es mi horario de hoy?", maxCharacters: 8_000,
      selection: emptyContextSelection, permissions: allPermissions, timeZone: "Europe/Madrid", now, repository: repo, loadMaterial: async () => Buffer.alloc(0),
    });
    expect(repo.grades).toHaveBeenCalledWith("user-a", [], expect.objectContaining({
      from: new Date("2026-09-06T22:00:00.000Z"),
      to: new Date("2026-09-13T22:00:00.000Z"),
    }));
    expect(repo.schedule).toHaveBeenCalledWith("user-a", expect.objectContaining({ dayOfWeek: 7 }));
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

  it("informa que imagenes excedentes no se analizaron", async () => {
    const repo = repository();
    repo.materials = vi.fn(async () => [1, 2, 3, 4].map((id) => ({ id: `image-${id}`, name: `Imagen ${id}`, mimeType: "image/png", size: 10, description: null, type: "NOTES", processingStatus: "PROCESSED", subjectName: null, topicName: null, storageKey: `image-${id}` })));
    const result = await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "Analiza mis imagenes", maxCharacters: 8_000, selection: emptyContextSelection, permissions: allPermissions, repository: repo, loadMaterial: async () => Buffer.from("png") });
    expect(result.images).toHaveLength(3);
    expect(result.warnings.some((warning) => warning.includes("Imagen 4") && warning.includes("no se analizo"))).toBe(true);
  });

  it("limita el análisis total y mantiene recuperables varios materiales lentos", async () => {
    const repo = repository();
    repo.materials = vi.fn(async () => [1, 2, 3, 4].map((id) => ({ id: `material-${id}`, name: `Apuntes ${id}`, mimeType: "text/plain", size: 10, description: null, type: "NOTES", processingStatus: "PROCESSED", subjectName: null, topicName: null, storageKey: `material-${id}` })));
    const loadMaterial = vi.fn((_key: string, signal?: AbortSignal) => new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => resolve(Buffer.from("contenido")), 500);
      signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("cancelado")); }, { once: true });
    }));
    const started = Date.now();
    const result = await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "Analiza mis materiales", maxCharacters: 8_000, selection: emptyContextSelection, permissions: allPermissions, repository: repo, loadMaterial, materialProcessingTimeoutMs: 250, materialProcessingTotalTimeoutMs: 100 });

    expect(Date.now() - started).toBeLessThan(350);
    expect(loadMaterial).toHaveBeenCalledTimes(2);
    expect(result.warnings.filter((warning) => warning.includes("AI_MATERIAL_TIMEOUT"))).toHaveLength(4);
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

  it("trata horario semanal como una consulta exclusiva de horario y calendario", async () => {
    const repo = repository();
    const plan = selectAcademicContextPlan({ message: "Cual es mi horario semanal?", permissions: allPermissions });
    expect(plan.intent).toBe("schedule");
    expect(plan.categories).toEqual(["schedule"]);
    expect(plan.toolNames).toEqual(["consult_schedule", "consult_calendar"]);

    await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "Cual es mi horario semanal?", maxCharacters: 4_000, selection: emptyContextSelection, permissions: allPermissions, repository: repo, loadMaterial: async () => Buffer.alloc(0) });
    expect(repo.tasks).not.toHaveBeenCalled();
    expect(repo.bosses).not.toHaveBeenCalled();
    expect(repo.studySessions).not.toHaveBeenCalled();
    expect(repo.schedule).toHaveBeenCalled();
    expect(repo.calendar).toHaveBeenCalled();
  });

  it("mantiene recientes en el intervalo pasado para las tareas", async () => {
    const repo = repository();
    const now = new Date("2026-09-13T10:00:00.000Z");
    await buildAcademicContext({ userId: "user-a", isEnabled: true, message: "Que tareas recientes tengo?", maxCharacters: 4_000, selection: emptyContextSelection, permissions: allPermissions, timeZone: "Europe/Madrid", now, repository: repo, loadMaterial: async () => Buffer.alloc(0) });
    expect(repo.tasks).toHaveBeenCalledWith("user-a", [], expect.objectContaining({
      from: new Date("2026-08-29T22:00:00.000Z"),
      to: now,
    }));
    expect(repo.bosses).toHaveBeenCalledWith("user-a", [], expect.objectContaining({
      from: new Date("2026-08-29T22:00:00.000Z"),
      to: now,
    }));
  });
});
