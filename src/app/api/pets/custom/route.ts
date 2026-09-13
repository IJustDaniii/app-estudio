import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { customPetNameSchema } from "@/lib/validation";
import { getPetStorageProvider } from "@/lib/pets/storage";
import { prisma } from "@/lib/prisma";

const MAX_CUSTOM_PET_IMAGE_SIZE = 5 * 1024 * 1024;
const CUSTOM_PET_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const formData = await request.formData();
  const nameResult = customPetNameSchema.safeParse(formData.get("name"));
  const file = formData.get("image");
  if (!nameResult.success || !(file instanceof File) || !CUSTOM_PET_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_CUSTOM_PET_IMAGE_SIZE) {
    return Response.json({ error: "INVALID_CUSTOM_PET" }, { status: 422 });
  }

  const storage = getPetStorageProvider();
  const storageKey = "custom/" + userId + "/" + randomUUID() + "-" + EXTENSIONS[file.type];
  try {
    await storage.put(storageKey, Buffer.from(await file.arrayBuffer()));
    const activePet = await prisma.userPet.findFirst({ where: { userId, isActive: true, status: "PRESENT" }, select: { id: true } });
    const pet = await prisma.userPet.create({
      data: { userId, source: "CUSTOM", name: nameResult.data, customImagePath: storageKey, customImageMimeType: file.type, isActive: !activePet },
      select: { id: true, name: true },
    });
    return Response.json(pet, { status: 201 });
  } catch {
    await storage.delete(storageKey).catch(() => undefined);
    return Response.json({ error: "CUSTOM_PET_CREATE_FAILED" }, { status: 500 });
  }
}
