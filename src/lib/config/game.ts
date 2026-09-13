/**
 * Valores deliberadamente provisionales. Sustituir aquí cuando se definan
 * las reglas definitivas de gamificación y planificación.
 */
/** Fuente única de las reglas activas de progreso; cualquier cambio debe reflejarse en `docs/fase-0-integridad.md`. */
export const GAME_RULES = {
  // Un nivel nuevo requiere 100 XP acumulados desde el nivel anterior.
  xpPerLevel: 100,
  // Cada minuto válido aporta 1 XP y cada bloque completo de 10 minutos aporta 1 moneda.
  xpPerStudyMinute: 1,
  coinsPerStudyBlockMinutes: 10,
  // La primera finalización válida de una tarea aporta 20 XP y 2 monedas.
  taskCompletionXp: 20,
  taskCompletionCoins: 2,
  // El objetivo visual diario no entrega una recompensa adicional por sí mismo.
  dailyStudyTargetMinutes: 60,
  // Cada misión se paga una sola vez al pasar de incompleta a completa.
  dailyMissions: [
    { title: "Estudia 30 minutos", metric: "STUDY_MINUTES", target: 30, rewardXp: 20, rewardCoins: 3 },
    { title: "Completa 2 tareas", metric: "TASKS_COMPLETED", target: 2, rewardXp: 20, rewardCoins: 3 },
  ],
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
