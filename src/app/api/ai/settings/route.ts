import { ZodError } from "zod";
import { aiApiError, apiUserId, parseAIJson } from "@/lib/ai/http";
import { getAISettings } from "@/lib/ai/repository";
import { aiSettingsSchema } from "@/lib/ai/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  return Response.json(await getAISettings(userId), { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  try {
    const data = await parseAIJson(request, aiSettingsSchema);
    const settings = await prisma.aISettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return Response.json(settings);
  } catch (error) {
    if (error instanceof ZodError || (error instanceof Error && error.message === "AI_BODY_TOO_LARGE")) return aiApiError("VALIDATION_ERROR", "La configuración no es válida", 422);
    return aiApiError("INTERNAL_ERROR", "No se pudo guardar la configuración", 500);
  }
}
