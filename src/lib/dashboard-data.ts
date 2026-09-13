import "server-only";
import { requireUserId } from "@/auth";
import { refreshDailyMissions } from "@/app/actions";
import { dateOnlyForLocalDay, localDayBounds } from "@/lib/domain/dates";
import { calculateStudyStreak } from "@/lib/domain/progress";
import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const userId = await requireUserId();
  const now = new Date();
  const { start, end } = localDayBounds(now);
  const missionDate = dateOnlyForLocalDay(now);
  await refreshDailyMissions(userId);

  const [user, tasks, nextBoss, todayStudy, todayCompleted, missions, sessionDates, activePet] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, xp: true, coins: true } }),
    prisma.task.findMany({ where: { userId, status: { not: "COMPLETED" } }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }], include: { subject: { include: { bosses: { where: { date: { gte: now } }, orderBy: { date: "asc" }, take: 1 } } } } }),
    prisma.boss.findFirst({ where: { userId, date: { gte: now } }, orderBy: { date: "asc" }, include: { subject: true } }),
    prisma.studySession.aggregate({ where: { userId, startedAt: { gte: start, lt: end } }, _sum: { actualMinutes: true } }),
    prisma.task.count({ where: { userId, completedAt: { gte: start, lt: end } } }),
    prisma.mission.findMany({ where: { userId, date: missionDate }, orderBy: { metric: "asc" } }),
    prisma.studySession.findMany({ where: { userId }, select: { startedAt: true }, orderBy: { startedAt: "desc" }, take: 90 }),
    prisma.userPet.findFirst({ where: { userId, isActive: true, status: "PRESENT" }, include: { species: true, evolution: true } }),
  ]);

  return {
    user,
    tasks,
    nextBoss,
    todayStudyMinutes: todayStudy._sum.actualMinutes ?? 0,
    todayCompleted,
    missions,
    activePet,
    streak: calculateStudyStreak(sessionDates.map((session) => session.startedAt), now),
    now,
  };
}
