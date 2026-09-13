import { aiApiError, aiRateLimitError, apiUserId } from "@/lib/ai/http";
import { checkAIRateLimit } from "@/lib/ai/rate-limit";
import { listChatsQuerySchema } from "@/lib/ai/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  const rate = checkAIRateLimit(`chats:list:${userId}`, 60);
  if (!rate.allowed) return aiRateLimitError(rate.retryAfterSeconds);
  const parsed = listChatsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return aiApiError("VALIDATION_ERROR", "Paginacion no valida", 422);
  const { page, pageSize } = parsed.data;
  const [rows, totalItems] = await Promise.all([
    prisma.aIChat.findMany({ where: { userId }, select: { id: true, title: true, createdAt: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.aIChat.count({ where: { userId } }),
  ]);
  return Response.json({ data: rows, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } }, { headers: { "Cache-Control": "private, no-store" } });
}

/** Chat creation is intentionally coupled to the first message transaction. */
export async function POST(_request: Request) {
  void _request;
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  return aiApiError("CHAT_CREATION_DEFERRED", "Los chats se crean al enviar el primer mensaje.", 405);
}
