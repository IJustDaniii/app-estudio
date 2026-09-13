import { auth } from "@/auth";
import { getPetStorageProvider } from "@/lib/pets/storage";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { id } = await context.params;
  const pet = await prisma.userPet.findFirst({ where: { id, userId, source: "CUSTOM" }, select: { customImagePath: true, customImageMimeType: true } });
  if (!pet?.customImagePath || !pet.customImageMimeType) return new Response("Not found", { status: 404 });
  try {
    const content = await getPetStorageProvider().get(pet.customImagePath);
    return new Response(new Uint8Array(content), { headers: { "Content-Type": pet.customImageMimeType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
