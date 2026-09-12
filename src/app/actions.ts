"use server";

import { AuthError } from "next-auth";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut, requireUserId } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_SUBJECTS } from "@/lib/demo-subjects";
import { GAME_RULES } from "@/lib/config/game";
import { dateOnlyForLocalDay, localDayBounds } from "@/lib/domain/dates";
import { rewardsForStudyMinutes } from "@/lib/domain/progress";
import {
  bossSchema,
  goalSchema,
  goalProgressSchema,
  gradeSchema,
  registerSchema,
  studySessionSchema,
  subjectSchema,
  taskSchema,
  timetableSchema,
} from "@/lib/validation";

export type AuthFormState = { error?: string } | undefined;

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function ensureOwnedSubject(userId: string, subjectId: string | null) {
  if (!subjectId) return null;
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId }, select: { id: true } });
  if (!subject) throw new Error("INVALID_SUBJECT");
  return subject.id;
}

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  try {
    await signIn("credentials", { ...formObject(formData), redirectTo: "/app" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Email o contraseña incorrectos." };
    throw error;
  }
}

export async function registerAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Revisa los datos. La contraseña necesita 8 caracteres, letra, número y símbolo." };

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (exists) return { error: "Ya existe una cuenta con ese email." };

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hash(parsed.data.password, 12),
      subjects: { create: DEMO_SUBJECTS.map(([name, color]) => ({ name, color })) },
    },
  });
  await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/app" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createSubject(formData: FormData) {
  const userId = await requireUserId();
  const data = subjectSchema.parse(formObject(formData));
  await prisma.subject.create({ data: { ...data, userId } });
  revalidatePath("/app");
}

export async function deleteSubject(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  await prisma.subject.deleteMany({ where: { id, userId } });
  revalidatePath("/app");
}

export async function createTimetableEntry(formData: FormData) {
  const userId = await requireUserId();
  const data = timetableSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.timetableEntry.create({ data: { ...data, userId } });
  revalidatePath("/app/timetable");
}

export async function updateTimetableEntry(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const data = timetableSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.timetableEntry.updateMany({ where: { id, userId }, data });
  revalidatePath("/app/timetable");
}

export async function deleteTimetableEntry(formData: FormData) {
  const userId = await requireUserId();
  await prisma.timetableEntry.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId } });
  revalidatePath("/app/timetable");
}

export async function createTask(formData: FormData) {
  const userId = await requireUserId();
  const data = taskSchema.parse(formObject(formData));
  const subjectId = await ensureOwnedSubject(userId, data.subjectId);
  await prisma.task.create({ data: { ...data, subjectId, userId } });
  revalidatePath("/app");
}

export async function completeTask(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const task = await prisma.task.findFirst({ where: { id, userId }, select: { status: true } });
  if (!task || task.status === "COMPLETED") return;
  await prisma.$transaction([
    prisma.task.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { xp: { increment: GAME_RULES.taskCompletionXp }, coins: { increment: GAME_RULES.taskCompletionCoins } } }),
  ]);
  await refreshDailyMissions(userId);
  revalidatePath("/app");
}

export async function deleteTask(formData: FormData) {
  const userId = await requireUserId();
  await prisma.task.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId } });
  revalidatePath("/app");
}

export async function createBoss(formData: FormData) {
  const userId = await requireUserId();
  const data = bossSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.boss.create({ data: { ...data, userId } });
  revalidatePath("/app/bosses");
}

export async function deleteBoss(formData: FormData) {
  const userId = await requireUserId();
  await prisma.boss.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId } });
  revalidatePath("/app");
}

export async function createGrade(formData: FormData) {
  const userId = await requireUserId();
  const data = gradeSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.grade.create({ data: { ...data, userId } });
  revalidatePath("/app/grades");
}

export async function deleteGrade(formData: FormData) {
  const userId = await requireUserId();
  await prisma.grade.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId } });
  revalidatePath("/app/grades");
}

export async function createGoal(formData: FormData) {
  const userId = await requireUserId();
  const data = goalSchema.parse(formObject(formData));
  await prisma.goal.create({ data: { ...data, isComplete: data.progress === 100, userId } });
  revalidatePath("/app/goals");
}

export async function updateGoal(formData: FormData) {
  const userId = await requireUserId();
  const { id, progress } = goalProgressSchema.parse(formObject(formData));
  await prisma.goal.updateMany({ where: { id, userId }, data: { progress, isComplete: progress === 100 } });
  revalidatePath("/app/goals");
}

export async function deleteGoal(formData: FormData) {
  const userId = await requireUserId();
  await prisma.goal.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId } });
  revalidatePath("/app/goals");
}

export async function recordStudySession(formData: FormData) {
  const userId = await requireUserId();
  const data = studySessionSchema.parse(formObject(formData));
  const subjectId = await ensureOwnedSubject(userId, data.subjectId);
  let taskId = data.taskId;
  if (taskId && !(await prisma.task.findFirst({ where: { id: taskId, userId }, select: { id: true } }))) taskId = null;
  const reward = rewardsForStudyMinutes(data.actualMinutes);
  await prisma.$transaction([
    prisma.studySession.create({ data: { ...data, subjectId, taskId, userId } }),
    prisma.user.update({ where: { id: userId }, data: { xp: { increment: reward.xp }, coins: { increment: reward.coins } } }),
  ]);
  await refreshDailyMissions(userId);
  redirect("/app");
}

export async function refreshDailyMissions(userId: string) {
  const { start, end } = localDayBounds();
  const missionDate = dateOnlyForLocalDay(start);
  await prisma.$transaction(
    GAME_RULES.dailyMissions.map((mission) =>
      prisma.mission.upsert({
        where: { userId_date_metric: { userId, date: missionDate, metric: mission.metric } },
        update: {},
        create: { ...mission, userId, date: missionDate },
      }),
    ),
  );
  const [minutes, completed] = await Promise.all([
    prisma.studySession.aggregate({ where: { userId, startedAt: { gte: start, lt: end } }, _sum: { actualMinutes: true } }),
    prisma.task.count({ where: { userId, completedAt: { gte: start, lt: end } } }),
  ]);
  await Promise.all([
    prisma.mission.updateMany({ where: { userId, date: missionDate, metric: "STUDY_MINUTES" }, data: { progress: minutes._sum.actualMinutes ?? 0, isComplete: (minutes._sum.actualMinutes ?? 0) >= GAME_RULES.dailyMissions[0].target } }),
    prisma.mission.updateMany({ where: { userId, date: missionDate, metric: "TASKS_COMPLETED" }, data: { progress: completed, isComplete: completed >= GAME_RULES.dailyMissions[1].target } }),
  ]);
}
