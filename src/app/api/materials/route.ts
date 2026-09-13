import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { contentLengthExceedsMaterialBodyLimit, getMaterialRequestBodyLimit, isMaterialBodyTooLargeError, limitMaterialRequestBody } from "@/lib/materials/body-limit";
import { getMaterialUploadLimits } from "@/lib/materials/constants";
import { ensureOwnedMaterialReferences } from "@/lib/materials/references";
import { materialDuplicateWhere } from "@/lib/materials/queries";
import { createStorageKey, isDuplicateInBatch, materialNameFromOriginalName, putMaterialWithCompensation, sha256, validateMaterialBatch, validateMaterialContent, validateMaterialFile } from "@/lib/materials/service";
import { getStorageProvider } from "@/lib/materials/storage";
import { prisma } from "@/lib/prisma";
import { materialUploadMetadataSchema } from "@/lib/validation";

export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}

const invalidFileCodes = ["INVALID_FILE_NAME", "INVALID_FILE_SIZE", "INVALID_FILE_TYPE", "INVALID_FILE_EXTENSION", "INVALID_FILE_CONTENT", "STORAGE_CLEANUP_FAILED", "STORAGE_RESTORE_FAILED", "STORAGE_MISSING_AFTER_DELETE"];

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const uploadLimits = getMaterialUploadLimits();
  const requestBodyLimit = getMaterialRequestBodyLimit(uploadLimits);
  if (contentLengthExceedsMaterialBodyLimit(request.headers.get("content-length"), requestBodyLimit)) {
    return Response.json({ error: "La petición supera el tamaño máximo permitido." }, { status: 413 });
  }

  try {
    const formData = await limitMaterialRequestBody(request, requestBodyLimit).formData();
    const metadata = materialUploadMetadataSchema.parse(Object.fromEntries([...formData.entries()].filter(([, value]) => typeof value === "string")));
    const references = await ensureOwnedMaterialReferences(userId, metadata);
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    try {
      validateMaterialBatch(files, uploadLimits);
    } catch (error) {
      const code = error instanceof Error ? error.message : "INVALID_BATCH";
      const message = code === "TOO_MANY_FILES" ? "El lote supera el número máximo de archivos." : code === "BATCH_TOO_LARGE" ? "El lote supera el tamaño total permitido." : "Selecciona al menos un archivo.";
      return Response.json({ error: message, created: [], duplicates: [], failed: files.map((file) => ({ name: file.name, error: code })) }, { status: 400 });
    }

    const storage = getStorageProvider();
    const created: Array<{ id: string; name: string }> = [];
    const duplicates: Array<{ name: string }> = [];
    const failed: Array<{ name: string; error: string }> = [];
    const seenHashes = new Set<string>();
    for (const file of files) {
      try {
        validateMaterialFile(file);
        const content = Buffer.from(await file.arrayBuffer());
        validateMaterialContent(file, content);
        const hash = sha256(content);
        if (isDuplicateInBatch(hash, seenHashes)) {
          duplicates.push({ name: file.name });
          continue;
        }
        const existing = await prisma.material.findFirst({ where: materialDuplicateWhere(userId, hash), select: { id: true } });
        if (existing) {
          duplicates.push({ name: file.name });
          continue;
        }

        const storageKey = createStorageKey(userId);
        try {
          const material = await putMaterialWithCompensation(storage, storageKey, content, () => prisma.material.create({
            data: {
              ...references,
              userId,
              name: materialNameFromOriginalName(file.name),
              originalName: file.name,
              mimeType: file.type,
              size: file.size,
              sha256: hash,
              storageKey,
              type: metadata.type,
              description: metadata.description,
              isFavorite: metadata.isFavorite,
            },
            select: { id: true, name: true },
          }));
          created.push(material);
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            duplicates.push({ name: file.name });
            continue;
          }
          throw error;
        }
      } catch (error) {
        const code = error instanceof Error ? error.message : "UPLOAD_FAILED";
        failed.push({ name: file.name, error: invalidFileCodes.includes(code) ? code : "UPLOAD_FAILED" });
      }
    }

    return Response.json({ created, duplicates, failed }, { status: failed.length ? 207 : created.length ? 201 : 200 });
  } catch (error) {
    if (isMaterialBodyTooLargeError(error)) {
      return Response.json({ error: "La petición supera el tamaño máximo permitido." }, { status: 413 });
    }
    if (error instanceof Error && ["INVALID_MATERIAL_REFERENCE", "TOPIC_SUBJECT_MISMATCH", "MATERIAL_SUBJECT_MISMATCH", "COMPLETED_EXAM_REQUIRES_BOSS"].includes(error.message)) {
      return Response.json({ error: "Los datos del material no son válidos" }, { status: 400 });
    }
    return Response.json({ error: "No se pudo subir el material" }, { status: 400 });
  }
}
