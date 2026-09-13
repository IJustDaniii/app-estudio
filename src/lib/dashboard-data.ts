import "server-only";
import { requireUserId } from "@/auth";
import { refreshDailyMissionsForUser } from "@/lib/domain/missions-service";
import { effectiveClassesForDate } from "@/lib/domain/calendar";
import { selectTomorrowMaterials } from "@/lib/domain/tomorrow";
import { normalizeTimeZone, zonedDateKey, zonedDayRange, zonedDayStart } from "@/lib/domain/dates";
import { calculateStudyStreak } from "@/lib/domain/progress";
import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const userId = await requireUserId();
  const now = new Date();
  const userRecord = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, xp: true, coins: true, timezone: true } });
  const timeZone = normalizeTimeZone(userRecord.timezone);
  const { start, end } = zonedDayRange(now, timeZone);
  const tomorrowStart = zonedDayStart(now, timeZone, 1);
  const tomorrowEnd = zonedDayStart(now, timeZone, 2);
  const tomorrowKey = zonedDateKey(tomorrowStart, timeZone);
  const tomorrowDatabaseStart = new Date(`${tomorrowKey}T00:00:00.000Z`);
  const tomorrowDatabaseEnd = new Date(`${zonedDateKey(tomorrowEnd, timeZone)}T00:00:00.000Z`);
  const missionDate = new Date(`${zonedDateKey(now, timeZone)}T00:00:00.000Z`);
  await refreshDailyMissionsForUser(userId, now);
  const updatedUserRecord = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, xp: true, coins: true } });
  const user = { name: updatedUserRecord.name, xp: updatedUserRecord.xp, coins: updatedUserRecord.coins };

  const [tasks, nextBoss, todayStudy, todayCompleted, missions, sessionDates, activePet, tomorrowTasks, tomorrowBosses, tomorrowEntries, tomorrowChanges] = await Promise.all([
    prisma.task.findMany({ where: { userId, status: { not: "COMPLETED" } }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }], include: { subject: { include: { bosses: { where: { date: { gte: now } }, orderBy: { date: "asc" }, take: 1 } } } } }),
    prisma.boss.findFirst({ where: { userId, date: { gte: now } }, orderBy: { date: "asc" }, include: { subject: true } }),
    prisma.studySession.aggregate({ where: { userId, startedAt: { gte: start, lt: end } }, _sum: { actualMinutes: true } }),
    prisma.task.count({ where: { userId, completedAt: { gte: start, lt: end } } }),
    prisma.mission.findMany({ where: { userId, date: missionDate }, orderBy: { metric: "asc" } }),
    prisma.studySession.findMany({ where: { userId }, select: { startedAt: true }, orderBy: { startedAt: "desc" }, take: 90 }),
    prisma.userPet.findFirst({ where: { userId, isActive: true, status: "PRESENT" }, include: { species: true, evolution: true } }),
    prisma.task.findMany({ where: { userId, status: { not: "COMPLETED" }, dueDate: { gte: tomorrowStart, lt: tomorrowEnd } }, orderBy: { dueDate: "asc" }, include: { subject: { select: { id: true, name: true } } } }),
    prisma.boss.findMany({ where: { userId, date: { gte: tomorrowStart, lt: tomorrowEnd } }, orderBy: { date: "asc" }, include: { subject: { select: { id: true, name: true } } } }),
    prisma.timetableEntry.findMany({ where: { userId }, orderBy: { startTime: "asc" }, select: { id: true, dayOfWeek: true, startTime: true, endTime: true, room: true, subjectId: true, subject: { select: { name: true } } } }),
    prisma.timetableChange.findMany({ where: { userId, date: { gte: tomorrowDatabaseStart, lt: tomorrowDatabaseEnd } }, orderBy: { startTime: "asc" }, select: { id: true, baseEntryId: true, date: true, startTime: true, endTime: true, room: true, subjectId: true, isCancelled: true, subject: { select: { name: true } } } }),
  ]);
  const recurring = tomorrowEntries.map((entry) => ({ id: entry.id, dayOfWeek: entry.dayOfWeek, startTime: entry.startTime, endTime: entry.endTime, room: entry.room, subjectName: entry.subject.name }));
  const overrides = tomorrowChanges.map((change) => ({ id: change.id, baseEntryId: change.baseEntryId, date: change.date, startTime: change.startTime, endTime: change.endTime, room: change.room, subjectName: change.subject.name, isCancelled: change.isCancelled }));
  const tomorrowClasses = effectiveClassesForDate(tomorrowKey, recurring, overrides);
  const cancelledEntryIds = new Set(tomorrowChanges.filter((change) => change.isCancelled && change.baseEntryId).map((change) => change.baseEntryId as string));
  const tomorrowWeekday = new Date(`${tomorrowKey}T12:00:00.000Z`).getUTCDay() || 7;
  const scheduledSubjectIds = tomorrowEntries.filter((entry) => entry.dayOfWeek === tomorrowWeekday && !cancelledEntryIds.has(entry.id)).map((entry) => entry.subjectId);
  const overrideSubjectIds = tomorrowChanges.filter((change) => !change.isCancelled).map((change) => change.subjectId);
  const materialClauses = [
    ...(tomorrowTasks.length ? [{ taskId: { in: tomorrowTasks.map((task) => task.id) } }] : []),
    ...([...new Set([...scheduledSubjectIds, ...overrideSubjectIds])].length ? [{ subjectId: { in: [...new Set([...scheduledSubjectIds, ...overrideSubjectIds])] } }] : []),
    ...(tomorrowBosses.length ? [{ bossId: { in: tomorrowBosses.map((boss) => boss.id) } }] : []),
  ];
  const tomorrowMaterialRows = materialClauses.length ? await prisma.material.findMany({ where: { userId, OR: materialClauses }, orderBy: { name: "asc" }, select: { id: true, name: true, taskId: true, subjectId: true, bossId: true } }) : [];
  const tomorrowMaterials = selectTomorrowMaterials(tomorrowTasks.map((task) => task.id), [...new Set([...scheduledSubjectIds, ...overrideSubjectIds])], tomorrowBosses.map((boss) => boss.id), tomorrowMaterialRows);

  return {
    user,
    tasks,
    nextBoss,
    todayStudyMinutes: todayStudy._sum.actualMinutes ?? 0,
    todayCompleted,
    missions,
    activePet,
    streak: calculateStudyStreak(sessionDates.map((session) => session.startedAt), now, timeZone),
    timeZone,
    now,
    tomorrow: { dateKey: tomorrowKey, classes: tomorrowClasses, tasks: tomorrowTasks, bosses: tomorrowBosses, materials: tomorrowMaterials },
  };
}
