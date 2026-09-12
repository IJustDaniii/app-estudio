export const MAX_MATERIAL_SIZE = 50 * 1024 * 1024;

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
