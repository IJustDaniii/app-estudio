import { ZodError } from "zod";
import { AIProviderError } from "@/lib/ai/errors";
import { aiApiError, aiRateLimitError, apiUserId, parseAIJson } from "@/lib/ai/http";
import { getAIProvider } from "@/lib/ai/providers";
import { checkAIRateLimit } from "@/lib/ai/rate-limit";
import { aiConnectionTestSchema } from "@/lib/ai/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  const rate = checkAIRateLimit(`settings:test:${userId}`, 10);
  if (!rate.allowed) return aiRateLimitError(rate.retryAfterSeconds);
  try {
    const data = await parseAIJson(request, aiConnectionTestSchema);
    const status = await getAIProvider("OLLAMA").testConnection({ ...data, baseUrl: data.ollamaUrl, timeoutMs: 5_000 });
    return Response.json(status);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === "AI_BODY_TOO_LARGE")) return aiApiError("VALIDATION_ERROR", "La URL o el modelo no son válidos", 422);
    if (error instanceof AIProviderError) return aiApiError(error.code, error.message, error.code === "TIMEOUT" ? 504 : 503);
    return aiApiError("INTERNAL_ERROR", "No se pudo probar la conexión", 500);
  }
}
