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

