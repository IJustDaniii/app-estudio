import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUserId = vi.hoisted(() => vi.fn());
const refreshDailyMissionsForUser = vi.hoisted(() => vi.fn());
const findUser = vi.hoisted(() => vi.fn());
const emptyFindMany = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const emptyCount = vi.hoisted(() => vi.fn().mockResolvedValue(0));
const emptyAggregate = vi.hoisted(() => vi.fn().mockResolvedValue({ _sum: { actualMinutes: null } }));
const emptyFindFirst = vi.hoisted(() => vi.fn().mockResolvedValue(null));

vi.mock("@/auth", () => ({ requireUserId }));
// El módulo solo sirve para marcar código de servidor; en esta prueba no necesita comportamiento.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/domain/missions-service", () => ({ refreshDailyMissionsForUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUniqueOrThrow: findUser },
    task: { findMany: emptyFindMany, count: emptyCount },
    boss: { findMany: emptyFindMany, findFirst: emptyFindFirst },
    studySession: { aggregate: emptyAggregate, findMany: emptyFindMany },
    mission: { findMany: emptyFindMany },
    userPet: { findFirst: emptyFindFirst },
    timetableEntry: { findMany: emptyFindMany },
    timetableChange: { findMany: emptyFindMany },
    material: { findMany: emptyFindMany },
  },
}));

describe("datos del panel principal", () => {
  beforeEach(() => {
    requireUserId.mockResolvedValue("user-a");
    refreshDailyMissionsForUser.mockResolvedValue(undefined);
    findUser
      .mockReset()
      .mockResolvedValueOnce({ name: "Dani", xp: 10, coins: 2, timezone: "Europe/Madrid" })
      .mockResolvedValueOnce({ name: "Dani", xp: 35, coins: 7, timezone: "Europe/Madrid" });
  });

  it("muestra los XP y monedas después de actualizar las misiones", async () => {
    const { getDashboardData } = await import("@/lib/dashboard-data");

    const data = await getDashboardData();

    expect(refreshDailyMissionsForUser).toHaveBeenCalledWith("user-a", expect.any(Date));
    expect(data.user).toEqual({ name: "Dani", xp: 35, coins: 7 });
    expect(findUser).toHaveBeenCalledTimes(2);
  });
});
