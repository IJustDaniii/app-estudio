import { aiApiError, aiRateLimitError, apiUserId } from "@/lib/ai/http";
import { checkAIRateLimit } from "@/lib/ai/rate-limit";
import { getAIContextOptions } from "@/lib/ai/repository";

export const runtime = "nodejs";

export async function GET() {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  const rate = checkAIRateLimit(`context-options:get:${userId}`, 30);
  if (!rate.allowed) return aiRateLimitError(rate.retryAfterSeconds);
  return Response.json(await getAIContextOptions(userId), { headers: { "Cache-Control": "private, no-store" } });
}
