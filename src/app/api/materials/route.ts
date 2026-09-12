import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { ensureOwnedMaterialReferences } from "@/lib/materials/references";
import { materialDuplicateWhere } from "@/lib/materials/queries";
import { createStorageKey, materialNameFromOriginalName, sha256, validateMaterialFile } from "@/lib/materials/service";
import { getStorageProvider } from "@/lib/materials/storage";
import { prisma } from "@/lib/prisma";
import { materialUploadMetadataSchema } from "@/lib/validation";

export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  try {
    const formData = await request.formData();
    const metadata = materialUploadMetadataSchema.parse(Object.fromEntries(
      [...formData.entries()].filter(([, value]) => typeof value === "string"),
    ));
    const references = await ensureOwnedMaterialReferences(userId, metadata);
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    if (!files.length) return Response.json({ error: "Selecciona al menos un archivo" }, { status: 400 });

    const storage = getStorageProvider();
    const created: Array<{ id: string; name: string }> = [];
    const duplicates: string[] = [];
    for (const file of files) {
      validateMaterialFile(file);
      const content = Buffer.from(await file.arrayBuffer());
      const hash = sha256(content);
      const existing = await prisma.material.findFirst({ where: materialDuplicateWhere(userId, hash), select: { id: true } });
      if (existing) {
        duplicates.push(file.name);
        continue;
      }

      const storageKey = createStorageKey(userId);
      await storage.put(storageKey, content);
      try {
        const material = await prisma.material.create({
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
        });
        created.push(material);
      } catch (error) {
        await storage.delete(storageKey);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          duplicates.push(file.name);
          continue;
        }
        throw error;
      }
    }
    return Response.json({ created, duplicates }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ["INVALID_FILE_NAME", "INVALID_FILE_SIZE", "INVALID_FILE_TYPE", "INVALID_MATERIAL_REFERENCE", "TOPIC_SUBJECT_MISMATCH", "COMPLETED_EXAM_REQUIRES_BOSS"].includes(error.message)) {
      return Response.json({ error: "Los datos del material no son válidos" }, { status: 400 });
    }
    return Response.json({ error: "No se pudo subir el material" }, { status: 400 });
  }
}
