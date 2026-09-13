import { z } from "zod";
import { bossSchema, goalSchema, gradeSchema, materialMetadataSchema, studySessionSchema, subjectSchema, taskSchema, timetableSchema, topicSchema } from "@/lib/validation";

const id = z.string().cuid();
const deleteSchema = z.object({ id });
const updateSubjectSchema = subjectSchema.partial().extend({ id });
const updateTopicSchema = topicSchema.partial().extend({ id });
const updateTaskSchema = taskSchema.partial().extend({ id });
const updateBossSchema = bossSchema.partial().extend({ id });
const updateGradeSchema = gradeSchema.partial().extend({ id });
const updateGoalSchema = goalSchema.partial().extend({ id });
const updateTimetableSchema = timetableSchema.partial().extend({ id });
const updateStudySessionSchema = studySessionSchema.partial().extend({ id });
const updateMaterialSchema = materialMetadataSchema.partial().extend({ id });
const calendarSchema = z.object({ kind: z.enum(["task", "boss", "goal"]), data: z.record(z.string(), z.unknown()) });

export const AI_ACTION_NAMES = [
  "create_subject", "update_subject", "delete_subject",
  "create_topic", "update_topic", "delete_topic",
  "create_task", "update_task", "delete_task",
  "create_boss", "update_boss", "delete_boss",
  "create_grade", "update_grade", "delete_grade",
  "create_goal", "update_goal", "delete_goal",
  "create_timetable", "update_timetable", "delete_timetable",
  "create_study_session", "update_study_session", "delete_study_session",
  "create_material_metadata", "update_material_metadata", "delete_material_metadata",
  "create_calendar_entry", "update_calendar_entry", "delete_calendar_entry",
] as const;

export type AIActionName = (typeof AI_ACTION_NAMES)[number];
export type ParsedAIAction = { action: AIActionName; arguments: Record<string, unknown>; entity: string; summary: string };

const schemas: Record<AIActionName, z.ZodTypeAny> = {
  create_subject: subjectSchema,
  update_subject: updateSubjectSchema,
  delete_subject: deleteSchema,
  create_topic: topicSchema,
  update_topic: updateTopicSchema,
  delete_topic: deleteSchema,
  create_task: taskSchema,
  update_task: updateTaskSchema,
  delete_task: deleteSchema,
  create_boss: bossSchema,
  update_boss: updateBossSchema,
  delete_boss: deleteSchema,
  create_grade: gradeSchema,
  update_grade: updateGradeSchema,
  delete_grade: deleteSchema,
  create_goal: goalSchema,
  update_goal: updateGoalSchema,
  delete_goal: deleteSchema,
  create_timetable: timetableSchema,
  update_timetable: updateTimetableSchema,
  delete_timetable: deleteSchema,
  create_study_session: studySessionSchema,
  update_study_session: updateStudySessionSchema,
  delete_study_session: deleteSchema,
  create_material_metadata: materialMetadataSchema,
  update_material_metadata: updateMaterialSchema,
  delete_material_metadata: deleteSchema,
  create_calendar_entry: calendarSchema,
  update_calendar_entry: calendarSchema,
  delete_calendar_entry: calendarSchema,
};

const entities: Record<AIActionName, string> = {
  create_subject: "asignatura", update_subject: "asignatura", delete_subject: "asignatura",
  create_topic: "tema", update_topic: "tema", delete_topic: "tema",
  create_task: "tarea", update_task: "tarea", delete_task: "tarea",
  create_boss: "Boss/examen", update_boss: "Boss/examen", delete_boss: "Boss/examen",
  create_grade: "nota", update_grade: "nota", delete_grade: "nota",
  create_goal: "objetivo", update_goal: "objetivo", delete_goal: "objetivo",
  create_timetable: "horario", update_timetable: "horario", delete_timetable: "horario",
  create_study_session: "sesion", update_study_session: "sesion", delete_study_session: "sesion",
  create_material_metadata: "metadatos de material", update_material_metadata: "metadatos de material", delete_material_metadata: "material",
  create_calendar_entry: "calendario", update_calendar_entry: "calendario", delete_calendar_entry: "calendario",
};

function safeText(value: unknown) {
  return typeof value === "string" ? value.replace(/[\r\n]+/g, " ").trim().slice(0, 100) : "";
}

function summary(action: AIActionName, value: Record<string, unknown>) {
  const verb = action.startsWith("create_") ? "Crear" : action.startsWith("update_") ? "Modificar" : "Eliminar";
  const label = safeText(value.title) || safeText(value.name) || safeText(value.label) || safeText(value.data && typeof value.data === "object" ? (value.data as Record<string, unknown>).title : "");
  return `${verb} ${entities[action]}${label ? `: ${label}` : ""}.`;
}

const FORBIDDEN_MUTATION_FIELDS = new Set([
  "xp", "coins", "level", "currentXp", "nextLevelXp", "streak", "rewardXp", "rewardCoins",
  "reward", "rewards", "achievement", "achievements", "statistics", "stats", "completedAt", "isComplete",
]);

function forbiddenField(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_MUTATION_FIELDS.has(key)) return key;
    const nestedField = forbiddenField(nested);
    if (nestedField) return nestedField;
  }
  return null;
}

function forbidden(action: AIActionName, value: Record<string, unknown>) {
  const status = value.status;
  if (forbiddenField(value)) return "La IA no puede modificar XP, monedas, nivel, racha, recompensas, logros, estadisticas ni estados derivados de la aplicacion.";
  if ((action === "create_task" || action === "update_task") && status === "COMPLETED") return "No se puede marcar una tarea como completada ni falsificar su finalizacion desde la IA.";
  if (action.includes("study_session")) return "Las sesiones no se pueden crear, editar ni borrar desde la IA porque alteran las estadisticas y posibles recompensas. Usa el temporizador de estudio.";
  if (action === "create_material_metadata") return "La IA no puede inventar un archivo. Sube primero el material desde Materiales y despues puedo proponer cambios en sus metadatos.";
  if (action.endsWith("_calendar_entry") && value.kind === "calendar") return "El calendario se deriva de tareas, Bosses y objetivos; usa una de esas entidades.";
  return null;
}

function prepareArguments(action: AIActionName, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const prepared = { ...(value as Record<string, unknown>) };
  if (action === "create_task") {
    if (!("subjectId" in prepared)) prepared.subjectId = null;
    if (!("dueDate" in prepared)) prepared.dueDate = null;
  }
  if (action === "create_goal" && !("targetDate" in prepared)) prepared.targetDate = null;
  if (action === "create_material_metadata") for (const key of ["subjectId", "topicId", "taskId", "bossId"]) if (!(key in prepared)) prepared[key] = null;
  return prepared;
}

export class AIActionContractError extends Error {
  constructor(public readonly code: "INVALID_ACTION" | "FORBIDDEN_ACTION", message: string) {
    super(message);
    this.name = "AIActionContractError";
  }
}

export function parseAIAction(action: unknown, rawArguments: unknown): ParsedAIAction {
  if (typeof action !== "string" || !AI_ACTION_NAMES.includes(action as AIActionName)) throw new AIActionContractError("INVALID_ACTION", "La accion solicitada no esta disponible.");
  const name = action as AIActionName;
  let arguments_: unknown = rawArguments;
  if (typeof arguments_ === "string") {
    try { arguments_ = JSON.parse(arguments_); } catch { throw new AIActionContractError("INVALID_ACTION", "Los datos de la accion no son validos."); }
  }
  if (arguments_ && typeof arguments_ === "object" && !Array.isArray(arguments_)) {
    const rawValue = arguments_ as Record<string, unknown>;
    const rawReason = forbidden(name, rawValue);
    if (rawReason) throw new AIActionContractError("FORBIDDEN_ACTION", rawReason);
  }
  const parsed = schemas[name].safeParse(prepareArguments(name, arguments_));
  if (!parsed.success || !parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) throw new AIActionContractError("INVALID_ACTION", "Los datos de la accion no son validos.");
  const value = parsed.data as Record<string, unknown>;
  const reason = forbidden(name, value);
  if (reason) throw new AIActionContractError("FORBIDDEN_ACTION", reason);
  if (name.endsWith("_calendar_entry")) {
    const kind = value.kind;
    if (kind !== "task" && kind !== "boss" && kind !== "goal") throw new AIActionContractError("INVALID_ACTION", "El tipo de elemento del calendario no es valido.");
    const nestedName = `${name.split("_")[0]}_${kind}`;
    const nested = parseAIAction(nestedName, value.data);
    return { action: name, arguments: { kind, data: nested.arguments }, entity: entities[name], summary: summary(name, { ...value, data: nested.arguments }) };
  }
  return { action: name, arguments: value, entity: entities[name], summary: summary(name, value) };
}

export const AI_ACTION_TOOL_DEFINITION = {
  name: "propose_action",
  description: "Prepara una propuesta de cambio sobre datos de la aplicacion. Nunca ejecuta el cambio: el usuario debe confirmarlo explicitamente.",
  access: "propose" as const,
  parameters: { type: "object", properties: { action: { type: "string", enum: AI_ACTION_NAMES }, arguments: { type: "object" } }, required: ["action", "arguments"] },
};

export const AI_WEB_TOOL_NAME = "search_web";
