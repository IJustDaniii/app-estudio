import { auth } from "@/auth";
import { ensureOwnedMaterialReferences } from "@/lib/materials/references";
import { materialOwnershipWhere } from "@/lib/materials/queries";
import { getStorageProvider } from "@/lib/materials/storage";
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
  const { material } = await getOwnedMaterial(id);
  if (!material) return new Response("No encontrado", { status: 404 });

  try {
    const content = await getStorageProvider().get(material.storageKey);
    const preview = new URL(request.url).searchParams.get("preview") === "1";
    const disposition = preview ? "inline" : "attachment";
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": material.mimeType,
        "Content-Length": String(material.size),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(material.originalName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
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
    await prisma.material.update({ where: { id: material.id }, data: { ...references, name: values.name, description: values.description, type: values.type, isFavorite: values.isFavorite } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Los datos del material no son válidos" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { userId, material } = await getOwnedMaterial(id);
  if (!userId) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!material) return Response.json({ error: "No encontrado" }, { status: 404 });

  try {
    await getStorageProvider().delete(material.storageKey);
    await prisma.material.delete({ where: { id: material.id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "No se pudo eliminar el material" }, { status: 500 });
  }
}
