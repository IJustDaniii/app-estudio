import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { ensureOwnedMaterialReferences, materialMetadataUpdate } from "@/lib/materials/references";
import { materialOwnershipWhere } from "@/lib/materials/queries";
import { deleteMaterialWithCompensation } from "@/lib/materials/service";
import { getStorageProvider } from "@/lib/materials/storage";
import { materialResponseHeaders } from "@/lib/materials/preview";
import { prisma } from "@/lib/prisma";
import { materialIdSchema, materialMetadataSchema } from "@/lib/validation";

export const runtime = "nodejs";

async function getOwnedMaterial(id: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { userId: null, material: null };
  const parsedId = materialIdSchema.safeParse(id);
  if (!parsedId.success) return { userId, material: null };
  const material = await prisma.material.findFirst({ where: materialOwnershipWhere(parsedId.data, userId) });
  return { userId, material };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { userId, material } = await getOwnedMaterial(id);
  if (!userId) return new Response("No autorizado", { status: 401 });
  if (!material) return new Response("No encontrado", { status: 404 });

  try {
    const content = await getStorageProvider().get(material.storageKey);
    const preview = new URL(request.url).searchParams.get("preview") === "1";
    const headers = materialResponseHeaders({ mimeType: material.mimeType, size: material.size, originalName: material.originalName, preview });
    return new Response(new Uint8Array(content), {
      headers,
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { userId, material } = await getOwnedMaterial(id);
  if (!userId) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!material) return Response.json({ error: "No encontrado" }, { status: 404 });

  try {
    const values = materialMetadataSchema.parse(await request.json());
    const references = await ensureOwnedMaterialReferences(userId, values);
    await prisma.material.update({ where: { id: material.id }, data: materialMetadataUpdate(values, references) });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Los datos del material no son válidos" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { userId, material } = await getOwnedMaterial(id);
  if (!userId) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!material) return Response.json({ ok: true });

  try {
    await deleteMaterialWithCompensation(getStorageProvider(), material.storageKey, async () => {
      try {
        await prisma.material.delete({ where: { id: material.id } });
      } catch (error) {
        // Another idempotent DELETE may have removed the row between the ownership check and this call.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return;
        throw error;
      }
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "No se pudo eliminar el material" }, { status: 500 });
  }
}
