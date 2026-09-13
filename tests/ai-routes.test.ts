import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const chatFindMany = vi.hoisted(() => vi.fn());
const chatCount = vi.hoisted(() => vi.fn());
const chatCreate = vi.hoisted(() => vi.fn());
const chatFindFirst = vi.hoisted(() => vi.fn());
const messageFindMany = vi.hoisted(() => vi.fn());
const messageCount = vi.hoisted(() => vi.fn());
const messageUpdateMany = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { aIChat: { findMany: chatFindMany, count: chatCount, create: chatCreate, findFirst: chatFindFirst }, aIMessage: { findMany: messageFindMany, count: messageCount, updateMany: messageUpdateMany } } }));

const { GET, POST } = await import("@/app/api/ai/chats/route");
const { GET: GET_CHAT } = await import("@/app/api/ai/chats/[id]/route");

describe("rutas autenticadas de IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "user-a" } });
    chatFindMany.mockResolvedValue([]);
    chatCount.mockResolvedValue(0);
    chatCreate.mockResolvedValue({ id: "cm0000000000000000000000", title: "Nuevo chat", createdAt: new Date(0), updatedAt: new Date(0) });
    chatFindFirst.mockResolvedValue({ id: "cm0000000000000000000000", title: "Antiguo", createdAt: new Date(0), updatedAt: new Date(0) });
    messageFindMany.mockResolvedValue([]);
    messageCount.mockResolvedValue(125);
    messageUpdateMany.mockResolvedValue({ count: 0 });
  });

  it("rechaza una ruta sin sesión", async () => {
    authMock.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/ai/chats"));
    expect(response.status).toBe(401);
    expect(chatFindMany).not.toHaveBeenCalled();
  });

  it("limita las lecturas y escrituras al usuario autenticado", async () => {
    await GET(new Request("http://localhost/api/ai/chats?page=2&pageSize=10"));
    expect(chatFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-a" }, skip: 10, take: 10 }));
    expect(chatCount).toHaveBeenCalledWith({ where: { userId: "user-a" } });

    const response = await POST(new Request("http://localhost/api/ai/chats", { method: "POST", body: JSON.stringify({ title: "Privado" }), headers: { "content-type": "application/json" } }));
    expect(response.status).toBe(405);
    expect(chatCreate).not.toHaveBeenCalled();
  });

  it("carga mensajes antiguos por páginas sin salir del chat del usuario", async () => {
    const response = await GET_CHAT(new Request("http://localhost/api/ai/chats/cm0000000000000000000000?messagePage=2&messagePageSize=10"), { params: Promise.resolve({ id: "cm0000000000000000000000" }) });
    expect(response.status).toBe(200);
    expect(messageFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { chatId: "cm0000000000000000000000", userId: "user-a" }, skip: 10, take: 10, orderBy: { createdAt: "desc" } }));
    await expect(response.json()).resolves.toMatchObject({ messagesPagination: { page: 2, pageSize: 10, totalItems: 125, totalPages: 13, hasNext: true } });
  });
});
