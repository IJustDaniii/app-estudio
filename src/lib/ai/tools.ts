import { z } from "zod";
import type { AIContextCategory, AIToolDefinition } from "@/lib/ai/types";
import { defaultAIAcademicPermissions, type AIAcademicPermissions, type ContextSelection } from "@/lib/ai/validation";

const querySchema = z.object({
  query: z.string().trim().max(120).optional(),
  subjectId: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

const toolCategory: Record<string, AIContextCategory> = {
  consult_subjects: "subjects",
  consult_topics: "subjects",
  consult_tasks: "tasksAndBosses",
  consult_bosses: "tasksAndBosses",
  consult_goals: "tasksAndBosses",
  consult_grades: "grades",
  consult_study_sessions: "sessionsAndStatistics",
  consult_statistics: "sessionsAndStatistics",
  consult_schedule: "schedule",
  consult_calendar: "schedule",
  consult_materials: "materials",
  consult_gamification: "gamification",
};

export const AI_TOOL_DEFINITIONS: AIToolDefinition[] = [
  { name: "consult_subjects", description: "Consulta asignaturas del usuario por nombre.", access: "read", parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_topics", description: "Consulta temas del usuario, opcionalmente dentro de una asignatura.", access: "read", parameters: { type: "object", properties: { query: { type: "string" }, subjectId: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_tasks", description: "Consulta tareas del usuario relevantes para la pregunta.", access: "read", parameters: { type: "object", properties: { query: { type: "string" }, subjectId: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_bosses", description: "Consulta Bosses o exámenes del usuario relevantes para la pregunta.", access: "read", parameters: { type: "object", properties: { query: { type: "string" }, subjectId: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_goals", description: "Consulta objetivos académicos del usuario.", access: "read", parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_grades", description: "Consulta notas del usuario relevantes para la pregunta.", access: "read", parameters: { type: "object", properties: { query: { type: "string" }, subjectId: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_study_sessions", description: "Consulta sesiones de estudio recientes del usuario.", access: "read", parameters: { type: "object", properties: { subjectId: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_statistics", description: "Consulta estadísticas resumidas de estudio y tareas completadas.", access: "read", parameters: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_schedule", description: "Consulta el horario semanal del usuario.", access: "read", parameters: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_calendar", description: "Consulta próximos eventos del calendario del usuario.", access: "read", parameters: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_materials", description: "Consulta materiales privados del usuario por nombre o asignatura.", access: "read", parameters: { type: "object", properties: { query: { type: "string" }, subjectId: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_gamification", description: "Consulta XP, nivel, monedas, misiones y racha del usuario.", access: "read", parameters: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 20 } } } },
];

export function toolDefinitionsForPermissions(permissions: AIAcademicPermissions = defaultAIAcademicPermissions, categories?: AIContextCategory[], toolNames?: string[]) {
  const allowedCategories = categories ? new Set(categories) : null;
  const allowedToolNames = toolNames ? new Set(toolNames) : null;
  return AI_TOOL_DEFINITIONS.filter((tool) => {
    const category = toolCategory[tool.name];
    if (allowedCategories && !allowedCategories.has(category)) return false;
    if (allowedToolNames && !allowedToolNames.has(tool.name)) return false;
    if (category === "grades") return permissions.canReadGrades;
    if (category === "tasksAndBosses") return permissions.canReadTasksAndBosses;
    if (category === "sessionsAndStatistics") return permissions.canReadSessionsAndStatistics;
    if (category === "schedule") return permissions.canReadSchedule;
    if (category === "materials") return permissions.canReadMaterials;
    if (category === "gamification") return permissions.canReadGamification;
    return true;
  });
}

export interface ReadOnlyToolRepository {
  subjects(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  topics?(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  tasks(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  bosses(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  goals?(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  grades(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  studySessions?(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  statistics?(userId: string, args: z.infer<typeof querySchema>): Promise<unknown>;
  schedule?(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  calendar?(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  materials?(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  gamification?(userId: string, args: z.infer<typeof querySchema>): Promise<unknown>;
}

export async function executeReadOnlyTool(input: { name: string; arguments: unknown; userId: string; repository: ReadOnlyToolRepository; allowedToolNames?: string[] }) {
  if (input.allowedToolNames && !input.allowedToolNames.includes(input.name)) throw new Error("AI_TOOL_NOT_ALLOWED");
  const args = querySchema.parse(input.arguments);
  switch (input.name) {
    case "consult_subjects": return input.repository.subjects(input.userId, args);
    case "consult_topics": return input.repository.topics ? input.repository.topics(input.userId, args) : [];
    case "consult_tasks": return input.repository.tasks(input.userId, args);
    case "consult_bosses": return input.repository.bosses(input.userId, args);
    case "consult_goals": return input.repository.goals ? input.repository.goals(input.userId, args) : [];
    case "consult_grades": return input.repository.grades(input.userId, args);
    case "consult_study_sessions": return input.repository.studySessions ? input.repository.studySessions(input.userId, args) : [];
    case "consult_statistics": return input.repository.statistics ? input.repository.statistics(input.userId, args) : {};
    case "consult_schedule": return input.repository.schedule ? input.repository.schedule(input.userId, args) : [];
    case "consult_calendar": return input.repository.calendar ? input.repository.calendar(input.userId, args) : [];
    case "consult_materials": return input.repository.materials ? input.repository.materials(input.userId, args) : [];
    case "consult_gamification": return input.repository.gamification ? input.repository.gamification(input.userId, args) : {};
    default: throw new Error("AI_TOOL_NOT_ALLOWED");
  }
}

export function createWriteProposal(action: string, arguments_: Record<string, unknown>) {
  return { action, arguments: arguments_, requiresConfirmation: true as const, canExecute: false as const };
}

export type { ContextSelection };
