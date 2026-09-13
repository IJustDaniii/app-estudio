import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getAISettingsMock = vi.hoisted(() => vi.fn());
const chatFindFirst = vi.hoisted(() => vi.fn());
const chatCreate = vi.hoisted(() => vi.fn());
const messageFindMany = vi.hoisted(() => vi.fn());
const messageFindFirst = vi.hoisted(() => vi.fn());
const messageCreate = vi.hoisted(() => vi.fn());
const messageUpdate = vi.hoisted(() => vi.fn());
const chatUpdate = vi.hoisted(() => vi.fn());
const getUserTimezoneMock = vi.hoisted(() => vi.fn());
const providerFactory = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { aIChat: { findFirst: chatFindFirst, create: chatCreate, update: chatUpdate }, aIMessage: { findFirst: messageFindFirst, findMany: messageFindMany, create: messageCreate, update: messageUpdate }, $transaction: transactionMock } }));
vi.mock("@/lib/ai/repository", () => ({ getAISettings: getAISettingsMock, getUserTimezone: getUserTimezoneMock, academicContextRepository: { subjects: vi.fn().mockResolvedValue([]), topics: vi.fn().mockResolvedValue([]), tasks: vi.fn().mockResolvedValue([]), bosses: vi.fn().mockResolvedValue([]), goals: vi.fn().mockResolvedValue([]), grades: vi.fn().mockResolvedValue([]), studySessions: vi.fn().mockResolvedValue([]), schedule: vi.fn().mockResolvedValue([]), calendar: vi.fn().mockResolvedValue([]), statistics: vi.fn().mockResolvedValue({ periodDays: 14, studyMinutes: 0, sessions: 0, averageSessionMinutes: 0, completedTasks: 0 }), gamification: vi.fn().mockResolvedValue({ xp: 0, coins: 0, level: 1, currentXp: 0, nextLevelXp: 100, streak: 0, missions: [] }), materials: vi.fn().mockResolvedValue([]) }, emptyReadOnlyToolRepository: {}, scopedReadOnlyToolRepository: vi.fn() }));
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
    transactionMock.mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations));
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
    messageFindFirst.mockResolvedValue(null);
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

  it("crea el chat y los primeros mensajes en una sola transacción al enviar a un chat nuevo", async () => {
    getAISettingsMock.mockResolvedValue({
      provider: "OLLAMA", ollamaUrl: "http://127.0.0.1:11434", model: "qwen3.5:9b", isAIEnabled: true, isAcademicContextEnabled: true,
      canReadGrades: true, canReadTasksAndBosses: true, canReadSessionsAndStatistics: true, canReadSchedule: true, canReadMaterials: true, canReadGamification: true, contextLimit: 12_000, maxItemsPerCategory: 20,
    });
    chatCreate.mockResolvedValue({ id: "cm0000000000000000000000", title: "Primera pregunta", createdAt: new Date(), updatedAt: new Date() });
    messageCreate.mockImplementation(async ({ data }: { data: { role: string } }) => ({ id: data.role === "ASSISTANT" ? "assistant-a" : "user-a", role: data.role, content: data.role === "ASSISTANT" ? "" : "Primera pregunta", status: data.role === "ASSISTANT" ? "PENDING" : "COMPLETE", model: "qwen3.5:9b", errorCode: null, contextSnapshot: null, createdAt: new Date() }));
    messageUpdate.mockResolvedValue({ id: "assistant-a", role: "ASSISTANT", content: "Respuesta", status: "COMPLETE", model: "qwen3.5:9b", errorCode: null, contextSnapshot: null, createdAt: new Date() });
    transactionMock.mockImplementation((operation: unknown) => typeof operation === "function" ? operation({ aIChat: { create: chatCreate }, aIMessage: { create: messageCreate } }) : Promise.all(operation as Promise<unknown>[]));
    providerFactory.mockReturnValue({ async *streamChat() { yield { type: "text-delta", content: "Respuesta" }; yield { type: "done", usage: {} }; } });

    const response = await POST(new Request("http://localhost/api/ai/chats/new/messages", { method: "POST", body: JSON.stringify({ content: "Primera pregunta" }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ id: "new" }) });
    await response.text();

    expect(response.status).toBe(200);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(chatCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "user-a" }) }));
    expect(messageCreate).toHaveBeenCalledTimes(2);
  });

  it("rechaza un requestId ya procesado sin crear otro chat o mensaje", async () => {
    getAISettingsMock.mockResolvedValue({
      provider: "OLLAMA", ollamaUrl: "http://127.0.0.1:11434", model: "qwen3.5:9b", isAIEnabled: true, isAcademicContextEnabled: true,
      canReadGrades: true, canReadTasksAndBosses: true, canReadSessionsAndStatistics: true, canReadSchedule: true, canReadMaterials: true, canReadGamification: true, contextLimit: 12_000, maxItemsPerCategory: 20,
    });
    messageFindFirst.mockResolvedValue({ id: "user-message", chatId: "cm0000000000000000000000" });

    const response = await POST(new Request("http://localhost/api/ai/chats/cm0000000000000000000000/messages", { method: "POST", body: JSON.stringify({ content: "Pregunta repetida", requestId: "11111111-1111-4111-8111-111111111111" }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ id: "cm0000000000000000000000" }) });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "DUPLICATE_REQUEST" } });
    expect(messageCreate).not.toHaveBeenCalled();
    expect(providerFactory).not.toHaveBeenCalled();
  });

  it("permite la busqueda web solo con la casilla de la barra del chat", async () => {
    getAISettingsMock.mockResolvedValue({
      provider: "OLLAMA", ollamaUrl: "http://127.0.0.1:11434", model: "qwen3.5:9b", isAIEnabled: true, isAcademicContextEnabled: true,
      canReadGrades: true, canReadTasksAndBosses: true, canReadSessionsAndStatistics: true, canReadSchedule: true, canReadMaterials: true, canReadGamification: true,
      contextLimit: 12_000, maxItemsPerCategory: 20,
    });
    messageFindMany.mockResolvedValue([]);
    messageFindFirst.mockResolvedValue(null);
    messageCreate.mockImplementation(async ({ data }: { data: { role: string } }) => ({ id: data.role === "ASSISTANT" ? "assistant-web" : "user-web", role: data.role, content: "", status: data.role === "ASSISTANT" ? "PENDING" : "COMPLETE", model: "qwen3.5:9b", errorCode: null, contextSnapshot: null, createdAt: new Date() }));
    messageUpdate.mockResolvedValue({ id: "assistant-web", role: "ASSISTANT", content: "ok", status: "COMPLETE", model: "qwen3.5:9b", errorCode: null, contextSnapshot: null, createdAt: new Date() });
    chatUpdate.mockResolvedValue({});
    let receivedTools: string[] | undefined;
    providerFactory.mockReturnValue({
      getModelCapabilities: vi.fn().mockResolvedValue({ vision: false, tools: true }),
      async *streamChat(input: { tools?: Array<{ name: string }> }) {
        receivedTools = input.tools?.map((tool) => tool.name);
        yield { type: "text-delta", content: "ok" };
        yield { type: "done", usage: {} };
      },
    });

    const response = await POST(new Request("http://localhost/api/ai/chats/cm0000000000000000000000/messages", { method: "POST", body: JSON.stringify({ content: "Busca en internet informacion actualizada", allowInternet: true }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ id: "cm0000000000000000000000" }) });
    await response.text();

    expect(receivedTools).toContain("search_web");
  });
});
