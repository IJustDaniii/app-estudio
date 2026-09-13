import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const chatFindFirst = vi.hoisted(() => vi.fn());
const createProposal = vi.hoisted(() => vi.fn());
const confirmProposal = vi.hoisted(() => vi.fn());
const cancelProposal = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { aIChat: { findFirst: chatFindFirst } } }));
vi.mock("@/lib/ai/proposals", () => ({ createAIActionProposal: createProposal, confirmAIAction: confirmProposal, cancelAIAction: cancelProposal, AIProposalError: class AIProposalError extends Error {} }));
vi.mock("@/lib/ai/rate-limit", () => ({ checkAIRateLimit: () => ({ allowed: true, retryAfterSeconds: 0 }) }));

const { POST: propose } = await import("@/app/api/ai/actions/proposals/route");
const { POST: confirm } = await import("@/app/api/ai/actions/proposals/[id]/confirm/route");

const id = "cm0000000000000000000000";
const token = "a".repeat(64);

describe("rutas de acciones de IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "user-a" } });
    chatFindFirst.mockResolvedValue({ id });
    createProposal.mockResolvedValue({ id, action: "create_subject", entity: "asignatura", summary: "Crear asignatura: Fisica.", expiresAt: new Date().toISOString(), confirmationToken: token });
    confirmProposal.mockResolvedValue({ proposalId: id, result: { id, name: "Fisica" } });
  });

  it("exige sesion antes de crear o confirmar", async () => {
    authMock.mockResolvedValue(null);
    const proposalResponse = await propose(new Request("http://localhost/api/ai/actions/proposals", { method: "POST", body: "{}" }));
    const confirmResponse = await confirm(new Request(`http://localhost/api/ai/actions/proposals/${id}/confirm`, { method: "POST", body: JSON.stringify({ confirmationToken: token }) }), { params: Promise.resolve({ id }) });
    expect(proposalResponse.status).toBe(401);
    expect(confirmResponse.status).toBe(401);
    expect(createProposal).not.toHaveBeenCalled();
    expect(confirmProposal).not.toHaveBeenCalled();
  });

  it("comprueba la pertenencia del chat y valida la accion antes de persistir", async () => {
    chatFindFirst.mockResolvedValue(null);
    const foreignChat = await propose(new Request("http://localhost/api/ai/actions/proposals", { method: "POST", body: JSON.stringify({ action: "create_subject", arguments: { name: "Fisica", color: "blue" }, chatId: id }) }));
    expect(foreignChat.status).toBe(404);
    expect(createProposal).not.toHaveBeenCalled();

    chatFindFirst.mockResolvedValue({ id });
    const invalid = await propose(new Request("http://localhost/api/ai/actions/proposals", { method: "POST", body: JSON.stringify({ action: "delete_user", arguments: { id } }) }));
    expect(invalid.status).toBe(422);
    expect(createProposal).not.toHaveBeenCalled();
  });

  it("pasa la cuenta autenticada a la propuesta y a la confirmacion", async () => {
    const proposalResponse = await propose(new Request("http://localhost/api/ai/actions/proposals", { method: "POST", body: JSON.stringify({ action: "create_subject", arguments: { name: "Fisica", color: "blue" }, chatId: id, requestId: "11111111-1111-4111-8111-111111111111" }) }));
    const confirmResponse = await confirm(new Request(`http://localhost/api/ai/actions/proposals/${id}/confirm`, { method: "POST", body: JSON.stringify({ confirmationToken: token }) }), { params: Promise.resolve({ id }) });
    expect(proposalResponse.status).toBe(201);
    expect(confirmResponse.status).toBe(200);
    expect(createProposal).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-a", chatId: id }));
    expect(confirmProposal).toHaveBeenCalledWith({ userId: "user-a", proposalId: id, confirmationToken: token });
  });
});
