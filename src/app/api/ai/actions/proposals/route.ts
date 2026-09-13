import { ZodError, z } from "zod";
import { AIActionContractError, AI_ACTION_NAMES } from "@/lib/ai/action-contract";
import { aiApiError, aiRateLimitError, apiUserId, parseAIJson } from "@/lib/ai/http";
import { checkAIRateLimit } from "@/lib/ai/rate-limit";
import { AIProposalError, createAIActionProposal } from "@/lib/ai/proposals";
import { chatIdSchema } from "@/lib/ai/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const proposalRequestSchema = z.object({
  action: z.enum(AI_ACTION_NAMES),
  arguments: z.unknown(),
  chatId: chatIdSchema.optional(),
  requestId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  const rate = checkAIRateLimit(`actions:propose:${userId}`, 20);
  if (!rate.allowed) return aiRateLimitError(rate.retryAfterSeconds);
  try {
    const data = await parseAIJson(request, proposalRequestSchema);
    if (data.chatId && !(await prisma.aIChat.findFirst({ where: { id: data.chatId, userId }, select: { id: true } }))) return aiApiError("NOT_FOUND", "Chat no encontrado", 404);
    const proposal = await createAIActionProposal({ userId, chatId: data.chatId, action: data.action, arguments: data.arguments, requestId: data.requestId });
    return Response.json(proposal, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === "AI_BODY_TOO_LARGE")) return aiApiError("VALIDATION_ERROR", "La propuesta no es valida", 422);
    if (error instanceof AIActionContractError) return aiApiError(error.code, error.message, 422);
    if (error instanceof AIProposalError) return aiApiError(error.code, error.message, error.code === "PROPOSAL_ALREADY_USED" ? 409 : 422);
    return aiApiError("INTERNAL_ERROR", "No se pudo preparar la propuesta", 500);
  }
}
