import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getAIContextOptionsMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/ai/repository", () => ({ getAIContextOptions: getAIContextOptionsMock }));
vi.mock("@/lib/ai/rate-limit", () => ({ checkAIRateLimit: () => ({ allowed: true }) }));

const { GET } = await import("@/app/api/ai/context/options/route");

describe("opciones de contexto de IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "user-a" } });
    getAIContextOptionsMock.mockResolvedValue({ subjects: [{ id: "subject-a", label: "Matemáticas" }], topics: [], tasks: [], bosses: [], grades: [], goals: [], studySessions: [], materials: [] });
  });

  it("consulta únicamente las opciones del usuario autenticado y evita caché pública", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(getAIContextOptionsMock).toHaveBeenCalledWith("user-a");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({ subjects: [{ id: "subject-a" }] });
  });

  it("rechaza la carga de opciones sin autenticación", async () => {
    authMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getAIContextOptionsMock).not.toHaveBeenCalled();
  });
});
