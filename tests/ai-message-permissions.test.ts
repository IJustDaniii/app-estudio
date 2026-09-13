import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getAISettingsMock = vi.hoisted(() => vi.fn());
const chatFindFirst = vi.hoisted(() => vi.fn());
const messageFindMany = vi.hoisted(() => vi.fn());
const messageCreate = vi.hoisted(() => vi.fn());
const messageUpdate = vi.hoisted(() => vi.fn());
const chatUpdate = vi.hoisted(() => vi.fn());
const getUserTimezoneMock = vi.hoisted(() => vi.fn());
const providerFactory = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { aIChat: { findFirst: chatFindFirst, update: chatUpdate }, aIMessage: { findMany: messageFindMany, create: messageCreate, update: messageUpdate }, $transaction: (operations: Promise<unknown>[]) => Promise.all(operations) } }));
vi.mock("@/lib/ai/repository", () => ({ getAISettings: getAISettingsMock, getUserTimezone: getUserTimezoneMock, academicContextRepository: { materials: vi.fn().mockResolvedValue([]) }, emptyReadOnlyToolRepository: {}, scopedReadOnlyToolRepository: vi.fn() }));
vi.mock("@/lib/ai/providers", () => ({ getAIProvider: providerFactory }));
vi.mock("@/lib/ai/rate-limit", () => ({ checkAIRateLimit: () => ({ allowed: true }) }));
vi.mock("@/lib/materials/storage", () => ({ getStorageProvider: vi.fn() }));

const { POST } = await import("@/app/api/ai/chats/[id]/messages/route");

describe("acceso al chat de IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "user-a" } });
    chatFindFirst.mockResolvedValue({ id: "cm0000000000000000000000", title: "Chat" });
    getAISettingsMock.mockResolvedValue({
      provider: "OLLAMA",
      ollamaUrl: "http://127.0.0.1:11434",
      model: "qwen3.5:9b",
      isAIEnabled: false,
      isAcademicContextEnabled: true,
      canReadGrades: true,
      canReadTasksAndBosses: true,
      canReadSessionsAndStatistics: true,
      canReadSchedule: true,
      canReadMaterials: true,
      canReadGamification: true,
      contextLimit: 12_000,
      maxItemsPerCategory: 20,
    });
    getUserTimezoneMock.mockResolvedValue("Europe/Madrid");
  });

  it("bloquea mensajes cuando la IA está desactivada sin consultar contexto ni proveedor", async () => {
    const response = await POST(new Request("http://localhost/api/ai/chats/cm0000000000000000000000/messages", { method: "POST", body: JSON.stringify({ content: "¿Qué estudio hoy?" }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ id: "cm0000000000000000000000" }) });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "AI_DISABLED" } });
    expect(messageFindMany).not.toHaveBeenCalled();
    expect(providerFactory).not.toHaveBeenCalled();
  });

  it("persiste en el snapshot los avisos generados durante la respuesta", async () => {
    getAISettingsMock.mockResolvedValue({
      provider: "OLLAMA",
      ollamaUrl: "http://127.0.0.1:11434",
      model: "qwen3.5:9b",
      isAIEnabled: true,
      isAcademicContextEnabled: true,
      canReadGrades: true,
      canReadTasksAndBosses: true,
      canReadSessionsAndStatistics: true,
      canReadSchedule: true,
      canReadMaterials: true,
      canReadGamification: true,
      contextLimit: 12_000,
      maxItemsPerCategory: 20,
    });
    messageFindMany.mockResolvedValue([]);
    messageCreate.mockImplementation(async ({ data }: { data: { role: string } }) => ({ id: data.role === "ASSISTANT" ? "assistant-a" : "user-a", role: data.role, content: "", status: data.role === "ASSISTANT" ? "PENDING" : "COMPLETE", model: "qwen3.5:9b", errorCode: null, contextSnapshot: null, createdAt: new Date() }));
    messageUpdate.mockResolvedValue({ id: "assistant-a", role: "ASSISTANT", content: "ok", status: "COMPLETE", model: "qwen3.5:9b", errorCode: null, contextSnapshot: null, createdAt: new Date() });
    chatUpdate.mockResolvedValue({});
    providerFactory.mockReturnValue({
      getModelCapabilities: vi.fn().mockRejectedValue(new Error("offline")),
      async *streamChat() {
        yield { type: "text-delta", content: "ok" };
        yield { type: "done", usage: {} };
      },
    });

    const response = await POST(new Request("http://localhost/api/ai/chats/cm0000000000000000000000/messages", { method: "POST", body: JSON.stringify({ content: "¿Qué materiales tengo?" }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ id: "cm0000000000000000000000" }) });
    await response.text();

    expect(messageUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "COMPLETE", contextSnapshot: expect.objectContaining({ warnings: ["No se pudieron comprobar las capacidades del modelo; se omitieron imágenes y herramientas."] }) }) }));
  });
});
