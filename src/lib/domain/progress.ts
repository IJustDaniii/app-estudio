import { GAME_RULES } from "@/lib/config/game";
import { DEFAULT_TIME_ZONE, zonedDateKey } from "@/lib/domain/dates";

export function calculateLevel(totalXp: number) {
  const safeXp = Math.max(0, Math.floor(totalXp));
  return {
    level: Math.floor(safeXp / GAME_RULES.xpPerLevel) + 1,
    currentXp: safeXp % GAME_RULES.xpPerLevel,
    nextLevelXp: GAME_RULES.xpPerLevel,
  };
}

export function rewardsForStudyMinutes(minutes: number) {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  return {
    xp: safeMinutes * GAME_RULES.xpPerStudyMinute,
    coins: Math.floor(safeMinutes / GAME_RULES.coinsPerStudyBlockMinutes),
  };
}

export function calculateStudyStreak(dates: Date[], now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const studied = new Set(dates.map((date) => zonedDateKey(date, timeZone)));
  const cursor = new Date(`${zonedDateKey(now, timeZone)}T00:00:00Z`);
  const key = () => cursor.toISOString().slice(0, 10);
  if (!studied.has(key())) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (studied.has(key())) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

