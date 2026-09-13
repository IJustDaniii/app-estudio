import { ZodError, z } from "zod";
import { aiApiError, aiRateLimitError, apiUserId, parseAIJson } from "@/lib/ai/http";
import { checkAIRateLimit } from "@/lib/ai/rate-limit";
import { AIProposalError, confirmAIAction } from "@/lib/ai/proposals";
import { chatIdSchema } from "@/lib/ai/validation";

export const runtime = "nodejs";
const confirmationSchema = z.object({ confirmationToken: z.string().regex(/^[a-f0-9]{64}$/i) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  const rate = checkAIRateLimit(`actions:confirm:${userId}`, 20);
  if (!rate.allowed) return aiRateLimitError(rate.retryAfterSeconds);
  const proposalId = chatIdSchema.safeParse((await context.params).id).data;
  if (!proposalId) return aiApiError("NOT_FOUND", "Propuesta no encontrada", 404);
  try {
    const data = await parseAIJson(request, confirmationSchema);
    return Response.json(await confirmAIAction({ userId, proposalId, confirmationToken: data.confirmationToken }), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === "AI_BODY_TOO_LARGE")) return aiApiError("VALIDATION_ERROR", "La confirmacion no es valida", 422);
    if (error instanceof AIProposalError) return aiApiError(error.code, error.message, error.code === "ACTION_FAILED" ? 409 : 422);
    return aiApiError("INTERNAL_ERROR", "No se pudo confirmar la propuesta", 500);
  }
}
