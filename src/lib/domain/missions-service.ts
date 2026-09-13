import { Prisma } from "@prisma/client";
import { GAME_RULES } from "@/lib/config/game";
import { normalizeTimeZone, zonedDateKey, zonedDayRange } from "@/lib/domain/dates";
import { updateMissionProgress } from "@/lib/domain/missions";
import { applyAcademicPetProgress } from "@/lib/pets/service";
import { prisma } from "@/lib/prisma";

function isSerializationConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function withSerializableRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isSerializationConflict(error)) throw error;
    }
  }
  throw lastError;
}

/** Refreshes today's missions and pays each newly completed mission in the same transaction. */
export async function refreshDailyMissionsForUser(userId: string, now = new Date()) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } });
  const timeZone = normalizeTimeZone(user.timezone);
  const { start, end } = zonedDayRange(now, timeZone);
  const missionDate = new Date(`${zonedDateKey(now, timeZone)}T00:00:00.000Z`);

  await withSerializableRetry(() => prisma.$transaction(async (tx) => {
    for (const mission of GAME_RULES.dailyMissions) {
      await tx.mission.upsert({
        where: { userId_date_metric: { userId, date: missionDate, metric: mission.metric } },
        update: {},
        create: { ...mission, userId, date: missionDate },
      });
    }

    const [minutes, completed] = await Promise.all([
      tx.studySession.aggregate({ where: { userId, startedAt: { gte: start, lt: end } }, _sum: { actualMinutes: true } }),
      tx.task.count({ where: { userId, completedAt: { gte: start, lt: end } } }),
    ]);
    const progressByMetric = { STUDY_MINUTES: minutes._sum.actualMinutes ?? 0, TASKS_COMPLETED: completed };

    for (const mission of GAME_RULES.dailyMissions) {
      const current = await tx.mission.findUniqueOrThrow({ where: { userId_date_metric: { userId, date: missionDate, metric: mission.metric } } });
      const update = updateMissionProgress(current, progressByMetric[mission.metric]);
      const changed = await tx.mission.updateMany({
        where: { id: current.id, isComplete: false },
        data: { progress: update.progress, isComplete: update.isComplete },
      });
      if (changed.count === 1 && update.shouldReward) {
        await tx.user.update({ where: { id: userId }, data: { xp: { increment: current.rewardXp }, coins: { increment: current.rewardCoins } } });
        await applyAcademicPetProgress(tx, userId, current.rewardXp);
      }
    }
  }, { isolationLevel: "Serializable" }));
}
