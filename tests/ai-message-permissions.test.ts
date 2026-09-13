import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getAISettingsMock = vi.hoisted(() => vi.fn());
const chatFindFirst = vi.hoisted(() => vi.fn());
const messageFindMany = vi.hoisted(() => vi.fn());
const providerFactory = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { aIChat: { findFirst: chatFindFirst } } }));
vi.mock("@/lib/ai/repository", () => ({ getAISettings: getAISettingsMock, academicContextRepository: {}, emptyReadOnlyToolRepository: {}, scopedReadOnlyToolRepository: vi.fn() }));
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
  });

  it("bloquea mensajes cuando la IA está desactivada sin consultar contexto ni proveedor", async () => {
    const response = await POST(new Request("http://localhost/api/ai/chats/cm0000000000000000000000/messages", { method: "POST", body: JSON.stringify({ content: "¿Qué estudio hoy?" }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ id: "cm0000000000000000000000" }) });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "AI_DISABLED" } });
    expect(messageFindMany).not.toHaveBeenCalled();
    expect(providerFactory).not.toHaveBeenCalled();
  });
});
