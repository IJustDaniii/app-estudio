import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const subjectFindFirst = vi.hoisted(() => vi.fn());
const taskFindFirst = vi.hoisted(() => vi.fn());
const sessionFindFirst = vi.hoisted(() => vi.fn());
const sessionCreate = vi.hoisted(() => vi.fn());
const userUpdate = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const refreshMissionsMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({ auth: authMock, requireUserId: async () => "user-a" }));
vi.mock("@/lib/prisma", () => ({ prisma: { subject: { findFirst: subjectFindFirst }, task: { findFirst: taskFindFirst }, studySession: { findFirst: sessionFindFirst }, $transaction: transactionMock } }));
vi.mock("@/lib/domain/missions-service", () => ({ refreshDailyMissionsForUser: refreshMissionsMock }));
vi.mock("@/lib/pets/service", () => ({ applyAcademicPetProgress: vi.fn().mockResolvedValue({ evolved: false, leveledUp: false }) }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { recordStudySession } = await import("@/app/actions");
const { createStudyStartToken } = await import("@/lib/domain/study-session");

const secret = "phase0-action-test-secret";
const requestId = "22222222-2222-4222-8222-222222222222";

function duplicateError() {
  return new Prisma.PrismaClientKnownRequestError("duplicate request", {
    code: "P2002",
    clientVersion: "6.12.0",
    meta: { target: ["userId", "requestId"] },
  });
}

function formFor(actualMinutes: number) {
  const startedAt = new Date(Date.now() - 20 * 60_000);
  const formData = new FormData();
  formData.set("requestId", requestId);
  formData.set("startToken", createStudyStartToken({ userId: "user-a", requestId, startedAt, plannedMinutes: 25 }, secret));
  formData.set("plannedMinutes", "25");
  formData.set("actualMinutes", String(actualMinutes));
  formData.set("subjectId", "");
  formData.set("taskId", "");
  return { formData, startedAt };
}

describe("repeticiones de la acción de guardar sesiones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = secret;
    authMock.mockResolvedValue({ user: { id: "user-a" } });
    subjectFindFirst.mockResolvedValue(null);
    taskFindFirst.mockResolvedValue(null);
    transactionMock.mockImplementation(async (operation: (tx: unknown) => Promise<unknown>) => operation({
      studySession: { create: sessionCreate },
      user: { update: userUpdate },
    }));
    sessionCreate.mockRejectedValue(duplicateError());
    refreshMissionsMock.mockResolvedValue(undefined);
  });

  it("devuelve un error si el mismo identificador cambia los minutos", async () => {
    const { formData, startedAt } = formFor(11);
    sessionFindFirst.mockResolvedValue({ startedAt, plannedMinutes: 25, actualMinutes: 10, subjectId: null, taskId: null });

    await expect(recordStudySession({}, formData)).resolves.toEqual({ error: "La misma petición se ha usado con datos diferentes." });
    expect(userUpdate).not.toHaveBeenCalled();
    expect(refreshMissionsMock).not.toHaveBeenCalled();
  });

  it("acepta una repetición idéntica sin volver a pagar", async () => {
    const { formData, startedAt } = formFor(10);
    sessionFindFirst.mockResolvedValue({ startedAt, plannedMinutes: 25, actualMinutes: 10, subjectId: null, taskId: null });

    await expect(recordStudySession({}, formData)).resolves.toEqual({ success: "La sesión ya estaba guardada; no se han repetido las recompensas." });
    expect(userUpdate).not.toHaveBeenCalled();
    expect(refreshMissionsMock).toHaveBeenCalledTimes(1);
  });
});
