import { PLANNER_WEIGHTS } from "@/lib/config/game";

export type PlannerTask = {
  id: string;
  title: string;
  planningMode: "FIXED_DEADLINE" | "FLEXIBLE_STUDY";
  priority: "LOW" | "MEDIUM" | "HIGH";
  difficulty: number;
  dueDate: Date | null;
  estimatedMinutes: number;
  relatedBossDate: Date | null;
};

export type PlannerRecommendation = {
  task: PlannerTask;
  score: number;
  reasons: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(date: Date, now: Date) {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

function scoreTask(task: PlannerTask, now: Date): PlannerRecommendation {
  let score = PLANNER_WEIGHTS.priority[task.priority];
  const reasons = [`Prioridad ${task.priority.toLowerCase()}`];

  score += Math.max(1, Math.min(5, task.difficulty)) * PLANNER_WEIGHTS.difficultyMultiplier;
  reasons.push(`Dificultad ${task.difficulty}/5`);

  if (task.dueDate) {
    const days = daysUntil(task.dueDate, now);
    if (days < 0) {
      score += PLANNER_WEIGHTS.overdue;
      reasons.push("La fecha límite ya ha pasado");
    } else if (days === 0) {
      score += PLANNER_WEIGHTS.dueToday;
      reasons.push("Vence hoy");
    } else if (days <= 3) {
      score += PLANNER_WEIGHTS.dueWithinThreeDays;
      reasons.push(`Vence en ${days} días`);
    } else if (days <= 7) {
      score += PLANNER_WEIGHTS.dueWithinSevenDays;
      reasons.push("Vence esta semana");
    }
  }

  if (task.relatedBossDate) {
    const days = daysUntil(task.relatedBossDate, now);
    if (days >= 0 && days <= 3) {
      score += PLANNER_WEIGHTS.bossWithinThreeDays;
      reasons.push("Prepara un Boss en los próximos 3 días");
    } else if (days <= 7) {
      score += PLANNER_WEIGHTS.bossWithinSevenDays;
      reasons.push("Prepara un Boss esta semana");
    }
  }

  return { task, score, reasons };
}

export function recommendNextTask(
  tasks: PlannerTask[],
  now: Date,
  availableMinutes: number,
): PlannerRecommendation | null {
  const fitting = tasks.filter(
    (task) => task.estimatedMinutes > 0 && task.estimatedMinutes <= availableMinutes,
  );

  if (fitting.length === 0) return null;

  return fitting
    .map((task) => {
      const recommendation = scoreTask(task, now);
      return {
        ...recommendation,
        score: recommendation.score + PLANNER_WEIGHTS.fitsAvailableTime,
        reasons: [...recommendation.reasons, `Cabe en ${availableMinutes} min`],
      };
    })
    .sort((a, b) => b.score - a.score || a.task.estimatedMinutes - b.task.estimatedMinutes)[0];
}

