import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const proposalCreate = vi.hoisted(() => vi.fn());
const proposalFindFirst = vi.hoisted(() => vi.fn());
const proposalUpdateMany = vi.hoisted(() => vi.fn());
const proposalUpdate = vi.hoisted(() => vi.fn());
const auditCreate = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());
const executeAction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: { aIActionProposal: { create: proposalCreate, findFirst: proposalFindFirst, updateMany: proposalUpdateMany, update: proposalUpdate }, aIAuditLog: { create: auditCreate }, $transaction: transaction } }));
vi.mock("@/lib/ai/action-services", () => ({ executeAIAction: executeAction }));

const { createAIActionProposal, confirmAIAction, cancelAIAction, AIProposalError } = await import("@/lib/ai/proposals");

const id = "cm0000000000000000000000";

describe("propuestas y confirmaciones de IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({ aIActionProposal: { create: proposalCreate, updateMany: proposalUpdateMany, update: proposalUpdate }, aIAuditLog: { create: auditCreate } }));
    proposalCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id, action: data.action, summary: data.summary, expiresAt: data.expiresAt }));
    proposalFindFirst.mockResolvedValue({ id, action: "create_subject", arguments: { name: "Fisica", color: "blue" }, argumentHash: "hash", summary: "Crear asignatura: Fisica.", status: "PENDING", confirmationTokenHash: "hash-token", expiresAt: new Date(Date.now() + 60_000), chatId: null });
    proposalUpdateMany.mockResolvedValue({ count: 1 });
    proposalUpdate.mockResolvedValue({});
    executeAction.mockResolvedValue({ id, name: "Fisica" });
  });

  it("crea una propuesta sin ejecutar el cambio y deja auditoria", async () => {
    const proposal = await createAIActionProposal({ userId: "user-a", action: "create_subject", arguments: { name: "Fisica", color: "blue" } });
    expect(proposal.confirmationToken).toMatch(/^[a-f0-9]{64}$/);
    expect(proposalCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "user-a", confirmationTokenHash: expect.not.stringMatching(proposal.confirmationToken) }) }));
    expect(executeAction).not.toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outcome: "PROPOSED", userId: "user-a" }) }));
  });

  it("requiere el token correcto, comprueba la cuenta y registra la ejecucion", async () => {
    const proposal = await createAIActionProposal({ userId: "user-a", action: "create_subject", arguments: { name: "Fisica", color: "blue" } });
    proposalFindFirst.mockResolvedValue({ id, action: "create_subject", arguments: { name: "Fisica", color: "blue" }, argumentHash: "hash", summary: proposal.summary, status: "PENDING", confirmationTokenHash: createHash("sha256").update(proposal.confirmationToken).digest("hex"), expiresAt: new Date(Date.now() + 60_000), chatId: null });
    const result = await confirmAIAction({ userId: "user-a", proposalId: id, confirmationToken: proposal.confirmationToken });
    expect(result.result).toEqual({ id, name: "Fisica" });
    expect(proposalFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id, userId: "user-a" }) }));
    expect(executeAction).toHaveBeenCalledWith(expect.anything(), "user-a", expect.objectContaining({ action: "create_subject" }));
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outcome: "EXECUTED" }) }));
  });

  it("rechaza confirmar con otro token sin tocar datos", async () => {
    proposalFindFirst.mockResolvedValue(null);
    await expect(confirmAIAction({ userId: "user-b", proposalId: id, confirmationToken: "a".repeat(64) })).rejects.toBeInstanceOf(AIProposalError);
    expect(executeAction).not.toHaveBeenCalled();
  });

  it("caduca la propuesta y registra el intento", async () => {
    proposalFindFirst.mockResolvedValue({ id, action: "create_subject", arguments: { name: "Fisica", color: "blue" }, summary: "Crear asignatura: Fisica.", status: "PENDING", confirmationTokenHash: "hash-token", expiresAt: new Date(Date.now() - 60_000), chatId: null });
    await expect(confirmAIAction({ userId: "user-a", proposalId: id, confirmationToken: "a".repeat(64) })).rejects.toMatchObject({ code: "PROPOSAL_EXPIRED" });
    expect(proposalUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "EXPIRED" } }));
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outcome: "EXPIRED" }) }));
    expect(executeAction).not.toHaveBeenCalled();
  });

  it("hace idempotente la confirmacion concurrente con un reclamo atomico", async () => {
    const tokenValue = "b".repeat(64);
    proposalFindFirst.mockResolvedValue({ id, action: "create_subject", arguments: { name: "Fisica", color: "blue" }, argumentHash: "hash", summary: "Crear asignatura: Fisica.", status: "PENDING", confirmationTokenHash: createHash("sha256").update(tokenValue).digest("hex"), expiresAt: new Date(Date.now() + 60_000), chatId: null });
    proposalUpdateMany.mockReset();
    proposalUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const results = await Promise.allSettled([
      confirmAIAction({ userId: "user-a", proposalId: id, confirmationToken: tokenValue }),
      confirmAIAction({ userId: "user-a", proposalId: id, confirmationToken: tokenValue }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(executeAction).toHaveBeenCalledTimes(1);
  });

  it("cancela de forma explicita sin ejecutar la accion", async () => {
    const result = await cancelAIAction({ userId: "user-a", proposalId: id, confirmationToken: "a".repeat(64) });
    expect(result).toEqual({ proposalId: id, cancelled: true });
    expect(proposalUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CANCELLED" } }));
    expect(executeAction).not.toHaveBeenCalled();
  });
});
