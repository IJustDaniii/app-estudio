import { createHash, randomUUID } from "node:crypto";
import { ALLOWED_MATERIAL_MIME_TYPES, DEFAULT_MAX_MATERIAL_BATCH_SIZE, DEFAULT_MAX_MATERIAL_FILES, MAX_MATERIAL_SIZE } from "@/lib/materials/constants";

export type MaterialUploadFile = { name: string; size: number; type: string };
export type MaterialUploadLimits = { maxFiles: number; maxBatchSize: number };

export class MaterialConsistencyError extends Error {
  constructor(public readonly code: "STORAGE_CLEANUP_FAILED" | "STORAGE_RESTORE_FAILED" | "STORAGE_MISSING_AFTER_DELETE") {
    super(code);
    this.name = "MaterialConsistencyError";
  }
}

const extensionMimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

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
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || extensionMimeTypes[extension] !== file.type) throw new Error("INVALID_FILE_EXTENSION");
}

export function validateMaterialContent(file: MaterialUploadFile, content: Buffer) {
  validateMaterialFile(file);
  if (content.length !== file.size) throw new Error("INVALID_FILE_SIZE");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const startsWith = (signature: number[]) => signature.every((byte, index) => content[index] === byte);
  const valid = extension === "pdf" ? content.subarray(0, 5).toString("ascii") === "%PDF-"
    : extension === "jpg" || extension === "jpeg" ? startsWith([0xff, 0xd8, 0xff])
      : extension === "png" ? startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        : extension === "gif" ? content.subarray(0, 6).toString("ascii") === "GIF87a" || content.subarray(0, 6).toString("ascii") === "GIF89a"
          : extension === "webp" ? content.subarray(0, 4).toString("ascii") === "RIFF" && content.subarray(8, 12).toString("ascii") === "WEBP"
            : extension === "doc" || extension === "ppt" ? startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
              : startsWith([0x50, 0x4b, 0x03, 0x04]) && content.includes(Buffer.from("[Content_Types].xml"));
  if (!valid) throw new Error("INVALID_FILE_CONTENT");
}

export function validateMaterialBatch(files: MaterialUploadFile[], limits: MaterialUploadLimits = { maxFiles: DEFAULT_MAX_MATERIAL_FILES, maxBatchSize: DEFAULT_MAX_MATERIAL_BATCH_SIZE }) {
  if (files.length < 1) throw new Error("NO_FILES");
  if (files.length > limits.maxFiles) throw new Error("TOO_MANY_FILES");
  const totalSize = files.reduce((total, file) => total + file.size, 0);
  if (!Number.isSafeInteger(totalSize) || totalSize > limits.maxBatchSize) throw new Error("BATCH_TOO_LARGE");
}

export function isDuplicateInBatch(hash: string, seenHashes: Set<string>) {
  const duplicate = seenHashes.has(hash);
  seenHashes.add(hash);
  return duplicate;
}

export async function deleteMaterialWithCompensation(
  storage: { get(key: string): Promise<Buffer>; exists(key: string): Promise<boolean>; delete(key: string): Promise<void>; put(key: string, content: Buffer): Promise<void> },
  storageKey: string,
  deleteMetadata: () => Promise<void>,
) {
  const content = (await storage.exists(storageKey)) ? await storage.get(storageKey) : null;
  await storage.delete(storageKey);
  try {
    await deleteMetadata();
  } catch (error) {
    if (!content) throw new MaterialConsistencyError("STORAGE_MISSING_AFTER_DELETE");
    try {
      await storage.put(storageKey, content);
    } catch {
      throw new MaterialConsistencyError("STORAGE_RESTORE_FAILED");
    }
    throw error;
  }
}

export async function putMaterialWithCompensation<T>(
  storage: { put(key: string, content: Buffer): Promise<void>; delete(key: string): Promise<void> },
  storageKey: string,
  content: Buffer,
  createMetadata: () => Promise<T>,
) {
  try {
    await storage.put(storageKey, content);
  } catch (error) {
    try {
      await storage.delete(storageKey);
    } catch {
      throw new MaterialConsistencyError("STORAGE_CLEANUP_FAILED");
    }
    throw error;
  }
  try {
    return await createMetadata();
  } catch (error) {
    try {
      await storage.delete(storageKey);
    } catch {
      throw new MaterialConsistencyError("STORAGE_CLEANUP_FAILED");
    }
    throw error;
  }
}
