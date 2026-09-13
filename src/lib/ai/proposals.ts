import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { parseAIAction, type ParsedAIAction } from "@/lib/ai/action-contract";
import { executeAIAction } from "@/lib/ai/action-services";
import { prisma } from "@/lib/prisma";

const PROPOSAL_TTL_MS = 10 * 60_000;

export type AIActionProposalForClient = { id: string; action: string; entity: string; summary: string; expiresAt: string; confirmationToken: string };

export class AIProposalError extends Error {
  constructor(public readonly code: "INVALID_PROPOSAL" | "CONFIRMATION_REQUIRED" | "PROPOSAL_EXPIRED" | "PROPOSAL_ALREADY_USED" | "ACTION_FAILED", message: string) {
    super(message);
    this.name = "AIProposalError";
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashArguments(value: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function jsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function clientProposal(proposal: { id: string; action: string; summary: string; expiresAt: Date }, parsed: ParsedAIAction, confirmationToken: string): AIActionProposalForClient {
  return { id: proposal.id, action: proposal.action, entity: parsed.entity, summary: proposal.summary, expiresAt: proposal.expiresAt.toISOString(), confirmationToken };
}

export async function createAIActionProposal(input: { userId: string; chatId?: string; action: unknown; arguments: unknown; requestId?: string }): Promise<AIActionProposalForClient> {
  let parsed: ParsedAIAction;
  try {
    parsed = parseAIAction(input.action, input.arguments);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new AIProposalError("INVALID_PROPOSAL", "La propuesta no es valida.");
  }
  const argumentHash = hashArguments(parsed.arguments);
  if (input.requestId) {
    const existing = await prisma.aIActionProposal.findFirst({ where: { userId: input.userId, requestId: input.requestId } });
    if (existing) {
      if (existing.argumentHash !== argumentHash || existing.action !== parsed.action) throw new AIProposalError("INVALID_PROPOSAL", "La clave de reintento se uso con otros datos.");
      throw new AIProposalError("PROPOSAL_ALREADY_USED", "Esta propuesta ya fue creada. Usa la confirmacion que recibiste.");
    }
  }
  const confirmationToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PROPOSAL_TTL_MS);
  try {
    const proposal = await prisma.$transaction(async (transaction) => {
      const created = await transaction.aIActionProposal.create({ data: { action: parsed.action, arguments: jsonValue(parsed.arguments), argumentHash, summary: parsed.summary, confirmationTokenHash: hashToken(confirmationToken), requestId: input.requestId, expiresAt, userId: input.userId, chatId: input.chatId }, select: { id: true, action: true, summary: true, expiresAt: true } });
      await transaction.aIAuditLog.create({ data: { action: parsed.action, entity: parsed.entity, outcome: "PROPOSED", summary: parsed.summary, metadata: jsonValue({ argumentHash }), proposalId: created.id, userId: input.userId, chatId: input.chatId } });
      return created;
    });
    return clientProposal(proposal, parsed, confirmationToken);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") throw new AIProposalError("PROPOSAL_ALREADY_USED", "Esta propuesta ya fue creada. Usa la confirmacion que recibiste.");
    throw error;
  }
}

export async function confirmAIAction(input: { userId: string; proposalId: string; confirmationToken: string }) {
  const tokenHash = hashToken(input.confirmationToken);
  const proposal = await prisma.aIActionProposal.findFirst({ where: { id: input.proposalId, userId: input.userId, confirmationTokenHash: tokenHash } });
  if (!proposal) throw new AIProposalError("CONFIRMATION_REQUIRED", "La confirmacion no es valida o la propuesta no pertenece a tu cuenta.");
  if (proposal.status !== "PENDING") throw new AIProposalError("PROPOSAL_ALREADY_USED", "La propuesta ya no esta pendiente.");
  if (proposal.expiresAt.getTime() <= Date.now()) {
    await prisma.$transaction(async (transaction) => {
      const expired = await transaction.aIActionProposal.updateMany({ where: { id: proposal.id, userId: input.userId, status: "PENDING" }, data: { status: "EXPIRED" } });
      if (expired.count) await transaction.aIAuditLog.create({ data: { action: proposal.action, entity: "unknown", outcome: "EXPIRED", summary: proposal.summary, proposalId: proposal.id, userId: input.userId, chatId: proposal.chatId } });
    });
    throw new AIProposalError("PROPOSAL_EXPIRED", "La propuesta ha caducado. Pide una nueva propuesta.");
  }
  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.aIActionProposal.updateMany({ where: { id: proposal.id, userId: input.userId, status: "PENDING", confirmationTokenHash: tokenHash }, data: { status: "EXECUTING" } });
      if (!claimed.count) throw new AIProposalError("PROPOSAL_ALREADY_USED", "La propuesta ya no esta pendiente.");
      try {
        const parsed = parseAIAction(proposal.action, proposal.arguments);
        const result = await executeAIAction(transaction, input.userId, parsed);
        await transaction.aIActionProposal.update({ where: { id: proposal.id }, data: { status: "EXECUTED", result: jsonValue(result) } });
        await transaction.aIAuditLog.create({ data: { action: parsed.action, entity: parsed.entity, outcome: "EXECUTED", summary: parsed.summary, metadata: jsonValue({ argumentHash: proposal.argumentHash }), proposalId: proposal.id, userId: input.userId, chatId: proposal.chatId } });
        return { ok: true as const, response: { proposalId: proposal.id, result } };
      } catch {
        await transaction.aIActionProposal.update({ where: { id: proposal.id }, data: { status: "FAILED" } });
        await transaction.aIAuditLog.create({ data: { action: proposal.action, entity: "unknown", outcome: "FAILED", summary: proposal.summary, metadata: jsonValue({ reason: "La operacion no se pudo completar" }), proposalId: proposal.id, userId: input.userId, chatId: proposal.chatId } });
        return { ok: false as const };
      }
    });
    if (!outcome.ok) throw new AIProposalError("ACTION_FAILED", "No se pudo aplicar el cambio. Tus datos no se han modificado parcialmente.");
    return outcome.response;
  } catch (error) {
    if (error instanceof AIProposalError) throw error;
    throw new AIProposalError("ACTION_FAILED", "No se pudo aplicar el cambio. Tus datos no se han modificado parcialmente.");
  }
}

export async function cancelAIAction(input: { userId: string; proposalId: string; confirmationToken: string }) {
  return prisma.$transaction(async (transaction) => {
    const result = await transaction.aIActionProposal.updateMany({ where: { id: input.proposalId, userId: input.userId, confirmationTokenHash: hashToken(input.confirmationToken), status: "PENDING" }, data: { status: "CANCELLED" } });
    if (!result.count) throw new AIProposalError("CONFIRMATION_REQUIRED", "La cancelacion no es valida o la propuesta ya no esta pendiente.");
    await transaction.aIAuditLog.create({ data: { action: "cancel_proposal", entity: "ai_action", outcome: "CANCELLED", summary: "Propuesta cancelada por el usuario.", proposalId: input.proposalId, userId: input.userId } });
    return { proposalId: input.proposalId, cancelled: true };
  });
}
