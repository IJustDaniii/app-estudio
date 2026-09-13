import { ZodError } from "zod";
import { aiApiError, aiRateLimitError, apiUserId, parseAIJson } from "@/lib/ai/http";
import { checkAIRateLimit } from "@/lib/ai/rate-limit";
import { createChatSchema, listChatsQuerySchema } from "@/lib/ai/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  const rate = checkAIRateLimit(`chats:list:${userId}`, 60);
  if (!rate.allowed) return aiRateLimitError(rate.retryAfterSeconds);
  const parsed = listChatsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return aiApiError("VALIDATION_ERROR", "Paginación no válida", 422);
  const { page, pageSize } = parsed.data;
  const [rows, totalItems] = await Promise.all([
    prisma.aIChat.findMany({ where: { userId }, select: { id: true, title: true, createdAt: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.aIChat.count({ where: { userId } }),
  ]);
  return Response.json({ data: rows, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  const rate = checkAIRateLimit(`chats:create:${userId}`, 30);
  if (!rate.allowed) return aiRateLimitError(rate.retryAfterSeconds);
  try {
    const data = await parseAIJson(request, createChatSchema);
    const chat = await prisma.aIChat.create({ data: { userId, title: data.title ?? "Nuevo chat" }, select: { id: true, title: true, createdAt: true, updatedAt: true } });
    return Response.json(chat, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === "AI_BODY_TOO_LARGE")) return aiApiError("VALIDATION_ERROR", "El chat no es válido", 422);
    return aiApiError("INTERNAL_ERROR", "No se pudo crear el chat", 500);
  }
}
