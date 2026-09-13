import { ZodError } from "zod";
import { aiApiError, aiRateLimitError, apiUserId, parseAIJson } from "@/lib/ai/http";
import { checkAIRateLimit } from "@/lib/ai/rate-limit";
import { chatIdSchema, listMessagesQuerySchema, renameChatSchema } from "@/lib/ai/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function ownedChat(rawId: string, userId: string) {
  const id = chatIdSchema.safeParse(rawId).data;
  return id ? prisma.aIChat.findFirst({ where: { id, userId }, select: { id: true, title: true, createdAt: true, updatedAt: true } }) : null;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  const rate = checkAIRateLimit(`chat:get:${userId}`, 60);
  if (!rate.allowed) return aiRateLimitError(rate.retryAfterSeconds);
  const chat = await ownedChat((await context.params).id, userId);
  if (!chat) return aiApiError("NOT_FOUND", "Chat no encontrado", 404);
  const parsedQuery = listMessagesQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsedQuery.success) return aiApiError("VALIDATION_ERROR", "Paginación no válida", 422);
  const { messagePage, messagePageSize } = parsedQuery.data;
  await prisma.aIMessage.updateMany({
    where: {
      chatId: chat.id,
      userId,
      status: "PENDING",
      updatedAt: { lt: new Date(Date.now() - 5 * 60_000) },
    },
    data: { status: "ERROR", errorCode: "STALE_RESPONSE" },
  });
  const [messagesDesc, totalItems] = await Promise.all([
    prisma.aIMessage.findMany({ where: { chatId: chat.id, userId }, select: { id: true, role: true, content: true, status: true, model: true, errorCode: true, contextSnapshot: true, createdAt: true }, orderBy: { createdAt: "desc" }, skip: (messagePage - 1) * messagePageSize, take: messagePageSize }),
    prisma.aIMessage.count({ where: { chatId: chat.id, userId } }),
  ]);
  const totalPages = Math.ceil(totalItems / messagePageSize);
  return Response.json({ ...chat, messages: messagesDesc.reverse(), messagesPagination: { page: messagePage, pageSize: messagePageSize, totalItems, totalPages, hasPrevious: messagePage > 1, hasNext: messagePage < totalPages } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  const rate = checkAIRateLimit(`chat:rename:${userId}`, 60);
  if (!rate.allowed) return aiRateLimitError(rate.retryAfterSeconds);
  const rawId = (await context.params).id;
  const id = chatIdSchema.safeParse(rawId).data;
  if (!id || !(await ownedChat(id, userId))) return aiApiError("NOT_FOUND", "Chat no encontrado", 404);
  try {
    const data = await parseAIJson(request, renameChatSchema);
    const chat = await prisma.aIChat.update({ where: { id }, data, select: { id: true, title: true, createdAt: true, updatedAt: true } });
    return Response.json(chat);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === "AI_BODY_TOO_LARGE")) return aiApiError("VALIDATION_ERROR", "El título no es válido", 422);
    return aiApiError("INTERNAL_ERROR", "No se pudo renombrar el chat", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  const rate = checkAIRateLimit(`chat:delete:${userId}`, 30);
  if (!rate.allowed) return aiRateLimitError(rate.retryAfterSeconds);
  const id = chatIdSchema.safeParse((await context.params).id).data;
  if (id) await prisma.aIChat.deleteMany({ where: { id, userId } });
  return Response.json({ ok: true });
}
