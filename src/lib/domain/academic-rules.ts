export type ReschedulableTask = {
  planningMode: "FIXED_DEADLINE" | "FLEXIBLE_STUDY";
  dueDate: Date | null;
};

export type RescheduleResult =
  | { allowed: true }
  | { allowed: false; reason: "OVERDUE_FIXED_DEADLINE" | "FIXED_DEADLINE_NEEDS_DATE" };

export function canRescheduleTask(task: ReschedulableTask, nextDueDate: Date | null, now = new Date()): RescheduleResult {
  if (task.planningMode === "FIXED_DEADLINE" && !nextDueDate) {
    return { allowed: false, reason: "FIXED_DEADLINE_NEEDS_DATE" };
  }

  const minute = (date: Date | null) => date === null ? null : Math.floor(date.getTime() / 60_000);
  const isChangingDate = minute(task.dueDate) !== minute(nextDueDate);
  if (task.planningMode === "FIXED_DEADLINE" && task.dueDate && task.dueDate < now && isChangingDate) {
    return { allowed: false, reason: "OVERDUE_FIXED_DEADLINE" };
  }

  return { allowed: true };
}

export type AcademicGrade = {
  value: number;
  weight: number;
  date: Date;
};

export function calculateWeightedAverage(grades: AcademicGrade[]) {
  const validGrades = grades.filter((grade) => grade.weight > 0);
  const totalWeight = validGrades.reduce((sum, grade) => sum + grade.weight, 0);
  if (!totalWeight) return null;
  return validGrades.reduce((sum, grade) => sum + grade.value * grade.weight, 0) / totalWeight;
}

export function gradeEvolution(grades: AcademicGrade[]) {
  const orderedGrades = [...grades].sort((a, b) => a.date.getTime() - b.date.getTime());
  let weightedSum = 0;
  let totalWeight = 0;
  return orderedGrades.map((grade) => {
    if (grade.weight > 0) {
      weightedSum += grade.value * grade.weight;
      totalWeight += grade.weight;
    }
    return { date: grade.date, value: grade.value, weight: grade.weight, average: totalWeight ? weightedSum / totalWeight : null };
  });
}

export function calculateRequiredGrade({ target, currentWeightedSum, currentWeight, nextWeight }: { target: number; currentWeightedSum: number; currentWeight: number; nextWeight: number }) {
  if (nextWeight <= 0) return null;
  return Math.round(((target * (currentWeight + nextWeight) - currentWeightedSum) / nextWeight) * 100) / 100;
}

export function gradeDifference(expected: number | null, actual: number | null) {
  if (expected === null || actual === null) return null;
  const value = Math.round((actual - expected) * 100) / 100;
  return { value, label: value === 0 ? "Igual a lo esperado" : value > 0 ? "Por encima de lo esperado" : "Por debajo de lo esperado" };
}
