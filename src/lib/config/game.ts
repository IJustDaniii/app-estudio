/**
 * Valores deliberadamente provisionales. Sustituir aquí cuando se definan
 * las reglas definitivas de gamificación y planificación.
 */
export const GAME_RULES = {
  xpPerLevel: 100,
  xpPerStudyMinute: 1,
  coinsPerStudyBlockMinutes: 10,
  taskCompletionXp: 20,
  taskCompletionCoins: 2,
} as const;

export const PLANNER_WEIGHTS = {
  priority: { LOW: 10, MEDIUM: 20, HIGH: 30 },
  difficultyMultiplier: 3,
  overdue: 60,
  dueToday: 45,
  dueWithinThreeDays: 30,
  dueWithinSevenDays: 15,
  bossWithinThreeDays: 25,
  bossWithinSevenDays: 12,
  fitsAvailableTime: 10,
} as const;

export const UI_OPTIONS = {
  priorities: ["LOW", "MEDIUM", "HIGH"] as const,
  difficulties: [1, 2, 3, 4, 5] as const,
  taskStatuses: ["PENDING", "IN_PROGRESS", "COMPLETED"] as const,
} as const;

