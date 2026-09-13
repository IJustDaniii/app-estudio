import { formatDateForTimeZone } from "@/lib/domain/dates";

type TimeZone = string;

export type TaskContextRecord = {
  id: string;
  title: string;
  planningMode: string;
  type: string;
  priority: string;
  difficulty: number;
  dueDate: Date | null;
  estimatedMinutes: number;
  status: string;
  notes: string | null;
  completedAt: Date | null;
  subjectName: string | null;
};

export type BossContextRecord = {
  id: string;
  title: string;
  date: Date;
  topics: string[];
  difficulty: number;
  preparation: number;
  targetGrade: number | null;
  expectedGrade: number | null;
  actualGrade: number | null;
  subjectName: string;
};

export type SerializedDate = { iso: string; local: string; timeZone: string };
export type SerializedTaskContext = Omit<TaskContextRecord, "dueDate" | "completedAt"> & { dueDate: SerializedDate | null; completedAt: SerializedDate | null };
export type SerializedBossContext = Omit<BossContextRecord, "date"> & { date: SerializedDate };
export type MaterialContextRecord = { id: string; name: string; mimeType: string; size: number; description: string | null; type: string; processingStatus: string; subjectName: string | null; topicName: string | null; storageKey: string };
export type SerializedMaterialMetadata = Omit<MaterialContextRecord, "storageKey">;

function serializeDate(value: Date | null, timeZone: TimeZone): SerializedDate | null {
  return value ? { iso: value.toISOString(), local: formatDateForTimeZone(value, timeZone)!, timeZone } : null;
}

export function serializeTaskContext(task: TaskContextRecord, timeZone: TimeZone): SerializedTaskContext {
  return { ...task, dueDate: serializeDate(task.dueDate, timeZone), completedAt: serializeDate(task.completedAt, timeZone) };
}

export function serializeBossContext(boss: BossContextRecord, timeZone: TimeZone): SerializedBossContext {
  return { ...boss, date: serializeDate(boss.date, timeZone)! };
}

export function formatTaskContext(task: TaskContextRecord, timeZone: TimeZone) {
  const value = serializeTaskContext(task, timeZone);
  return `[Tarea] ${value.title}; asignatura=${value.subjectName ?? "sin asignatura"}; planificación=${value.planningMode}; tipo=${value.type}; prioridad=${value.priority}; dificultad=${value.difficulty}/5; fecha=${value.dueDate?.local ?? "sin fecha"}; duración=${value.estimatedMinutes} min; estado=${value.status}; notas=${value.notes ?? "sin notas"}; finalización=${value.completedAt?.local ?? "sin finalizar"}`;
}

export function formatBossContext(boss: BossContextRecord, timeZone: TimeZone) {
  const value = serializeBossContext(boss, timeZone);
  return `[Boss] ${value.title}; asignatura=${value.subjectName}; temas=${value.topics.join(", ") || "sin temas"}; dificultad=${value.difficulty}/5; preparación=${value.preparation}%; fecha=${value.date.local}; nota objetivo=${value.targetGrade ?? "sin nota"}; nota esperada=${value.expectedGrade ?? "sin nota"}; nota real=${value.actualGrade ?? "sin nota"}`;
}

export function serializeMaterialMetadata(material: MaterialContextRecord): SerializedMaterialMetadata {
  return { id: material.id, name: material.name, mimeType: material.mimeType, size: material.size, description: material.description, type: material.type, processingStatus: material.processingStatus, subjectName: material.subjectName, topicName: material.topicName };
}

export function formatMaterialMetadata(material: MaterialContextRecord) {
  const value = serializeMaterialMetadata(material);
  return `[Material] ${value.name}; tipo=${value.type}; MIME=${value.mimeType}; tamaño=${value.size} bytes; estado=${value.processingStatus}; asignatura=${value.subjectName ?? "sin asignatura"}; tema=${value.topicName ?? "sin tema"}; descripción=${value.description ?? "sin descripción"}`;
}
