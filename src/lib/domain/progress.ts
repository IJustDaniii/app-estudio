import { GAME_RULES } from "@/lib/config/game";

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

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function calculateStudyStreak(dates: Date[], now = new Date()) {
  const studied = new Set(dates.map(dateKey));
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!studied.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (studied.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

