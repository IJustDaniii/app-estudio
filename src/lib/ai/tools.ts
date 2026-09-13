import { z } from "zod";
import type { AIContextCategory, AIToolDefinition } from "@/lib/ai/types";
import { AI_ACTION_TOOL_DEFINITION, AI_WEB_TOOL_NAME } from "@/lib/ai/action-contract";
import type { WebSearchResponse } from "@/lib/ai/web-search";
import { defaultAIAcademicPermissions, type AIAcademicPermissions, type ContextSelection } from "@/lib/ai/validation";

const timeRangeSchema = z.enum(["today", "tomorrow", "week", "month", "upcoming", "recent"]).optional();
const querySchema = z.object({
  query: z.string().trim().max(120).optional(),
  subjectId: z.string().cuid().optional(),
  timeRange: timeRangeSchema,
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(20).default(10),
});
const webSearchSchema = z.object({ query: z.string().trim().min(1).max(200) });

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

const timeRangeProperty = { type: "string", enum: ["today", "tomorrow", "week", "month", "upcoming", "recent"] };
const temporalProperties = {
  query: { type: "string" },
  subjectId: { type: "string" },
  timeRange: timeRangeProperty,
  from: { type: "string", format: "date-time" },
  to: { type: "string", format: "date-time" },
  limit: { type: "integer", minimum: 1, maximum: 20 },
};

export const AI_TOOL_DEFINITIONS: AIToolDefinition[] = [
  { name: "consult_subjects", description: "Consulta asignaturas por texto.", access: "read", parameters: { type: "object", properties: { query: temporalProperties.query, limit: temporalProperties.limit } } },
  { name: "consult_topics", description: "Consulta temas por texto y asignatura.", access: "read", parameters: { type: "object", properties: { query: temporalProperties.query, subjectId: temporalProperties.subjectId, limit: temporalProperties.limit } } },
  { name: "consult_tasks", description: "Consulta tareas. query es texto y timeRange es el filtro temporal independiente.", access: "read", parameters: { type: "object", properties: temporalProperties } },
  { name: "consult_bosses", description: "Consulta Bosses o exámenes. query es texto y timeRange es el filtro temporal independiente.", access: "read", parameters: { type: "object", properties: temporalProperties } },
  { name: "consult_goals", description: "Consulta objetivos académicos.", access: "read", parameters: { type: "object", properties: { query: temporalProperties.query, timeRange: temporalProperties.timeRange, limit: temporalProperties.limit } } },
  { name: "consult_grades", description: "Consulta notas; timeRange se aplica a from/to.", access: "read", parameters: { type: "object", properties: temporalProperties } },
  { name: "consult_study_sessions", description: "Consulta sesiones usando el rango temporal indicado.", access: "read", parameters: { type: "object", properties: temporalProperties } },
  { name: "consult_statistics", description: "Consulta estadísticas usando el rango temporal indicado.", access: "read", parameters: { type: "object", properties: { query: temporalProperties.query, timeRange: temporalProperties.timeRange, limit: temporalProperties.limit } } },
  { name: "consult_schedule", description: "Consulta el día del horario si timeRange es today/tomorrow; week devuelve la semana completa.", access: "read", parameters: { type: "object", properties: { query: temporalProperties.query, timeRange: temporalProperties.timeRange, limit: temporalProperties.limit } } },
  { name: "consult_calendar", description: "Consulta calendario usando query como texto y timeRange como fechas.", access: "read", parameters: { type: "object", properties: { query: temporalProperties.query, timeRange: temporalProperties.timeRange, limit: temporalProperties.limit } } },
  { name: "consult_materials", description: "Consulta materiales por texto o asignatura.", access: "read", parameters: { type: "object", properties: { query: temporalProperties.query, subjectId: temporalProperties.subjectId, limit: temporalProperties.limit } } },
  { name: "consult_gamification", description: "Consulta XP, nivel, monedas, misiones y racha.", access: "read", parameters: { type: "object", properties: { limit: temporalProperties.limit } } },
  { name: AI_WEB_TOOL_NAME, description: "Busca informacion actualizada en Internet. Solo devuelve fuentes externas y nunca recibe datos personales de la aplicacion.", access: "read", parameters: { type: "object", properties: { query: { type: "string", minLength: 1, maxLength: 200 } }, required: ["query"] } },
];

export function toolDefinitionsForPermissions(permissions: AIAcademicPermissions = defaultAIAcademicPermissions, categories?: AIContextCategory[], toolNames?: string[], options?: { includeAction?: boolean; includeWeb?: boolean }) {
  const allowedCategories = categories ? new Set(categories) : null;
  const allowedToolNames = toolNames ? new Set(toolNames) : null;
  const definitions = [...AI_TOOL_DEFINITIONS, ...(options?.includeAction ? [AI_ACTION_TOOL_DEFINITION] : [])];
  return definitions.filter((tool) => {
    if (tool.name === AI_WEB_TOOL_NAME) return Boolean(options?.includeWeb) && (!allowedToolNames || allowedToolNames.has(tool.name));
    if (tool.name === AI_ACTION_TOOL_DEFINITION.name) return Boolean(options?.includeAction) && (!allowedToolNames || allowedToolNames.has(tool.name));
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
  webSearch?(userId: string, args: z.infer<typeof webSearchSchema>): Promise<WebSearchResponse>;
}

export async function executeReadOnlyTool(input: { name: string; arguments: unknown; userId: string; repository: ReadOnlyToolRepository; allowedToolNames?: string[]; allowWebSearch?: boolean }) {
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
    case AI_WEB_TOOL_NAME: {
      if (!input.allowWebSearch || !input.repository.webSearch) throw new Error("AI_WEB_NOT_ALLOWED");
      const webArgs = webSearchSchema.parse(input.arguments);
      return input.repository.webSearch(input.userId, webArgs);
    }
    default: throw new Error("AI_TOOL_NOT_ALLOWED");
  }
}

export function createWriteProposal(action: string, arguments_: Record<string, unknown>) {
  return { action, arguments: arguments_, requiresConfirmation: true as const, canExecute: false as const };
}

export type { ContextSelection };
