import { createHash, randomUUID } from "node:crypto";
import { ALLOWED_MATERIAL_MIME_TYPES, MAX_MATERIAL_SIZE } from "@/lib/materials/constants";

export function sha256(content: Buffer) {
  return createHash("sha256").update(content).digest("hex");
}

export function createStorageKey(userId: string) {
  return `materials/${userId}/${randomUUID().replace(/-/g, "")}`;
}

export function materialNameFromOriginalName(originalName: string) {
  const baseName = originalName.replace(/\\/g, "/").split("/").pop() ?? "material";
  const name = baseName.replace(/\.[^.]+$/, "").trim();
  return name.slice(0, 160) || "Material";
}

export function validateMaterialFile(file: { name: string; size: number; type: string }) {
  if (!file.name.trim() || file.name.length > 255) throw new Error("INVALID_FILE_NAME");
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_MATERIAL_SIZE) throw new Error("INVALID_FILE_SIZE");
  if (!ALLOWED_MATERIAL_MIME_TYPES.has(file.type)) throw new Error("INVALID_FILE_TYPE");
}
