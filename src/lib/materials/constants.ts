export const MAX_MATERIAL_SIZE = 50 * 1024 * 1024;
export const DEFAULT_MAX_MATERIAL_FILES = 20;
export const DEFAULT_MAX_MATERIAL_BATCH_SIZE = 200 * 1024 * 1024;
export const HARD_MAX_MATERIAL_FILES = 100;
export const HARD_MAX_MATERIAL_BATCH_SIZE = 1024 * 1024 * 1024;
export const MATERIAL_PAGE_SIZE = 50;
export const MATERIAL_MAX_PAGE = 1_000;
export const MATERIAL_OPTION_LIMIT = 100;

function positiveInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export function getMaterialUploadLimits() {
  return {
    maxFiles: positiveInteger(process.env.MATERIALS_MAX_FILES, DEFAULT_MAX_MATERIAL_FILES, HARD_MAX_MATERIAL_FILES),
    maxBatchSize: positiveInteger(process.env.MATERIALS_MAX_BATCH_SIZE, DEFAULT_MAX_MATERIAL_BATCH_SIZE, HARD_MAX_MATERIAL_BATCH_SIZE),
  };
}

export const MATERIAL_TYPES = ["NOTES", "EXERCISES", "EXAM", "SOLUTIONS", "THEORY", "RUBRIC", "PROJECT", "OTHER"] as const;
export type MaterialTypeValue = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_TYPE_LABELS: Record<MaterialTypeValue, string> = {
  NOTES: "Apuntes",
  EXERCISES: "Ejercicios",
  EXAM: "Examen",
  SOLUTIONS: "Soluciones",
  THEORY: "Teoría",
  RUBRIC: "Rúbrica",
  PROJECT: "Proyecto",
  OTHER: "Otro",
};

export const ALLOWED_MATERIAL_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export function isPreviewableMimeType(mimeType: string) {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}
