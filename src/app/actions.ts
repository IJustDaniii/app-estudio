"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { AuthError } from "next-auth";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut, requireUserId } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_SUBJECTS } from "@/lib/demo-subjects";
import { rewardsForStudyMinutes, taskCompletionReward } from "@/lib/domain/progress";
import { canRescheduleTask } from "@/lib/domain/academic-rules";
import { refreshDailyMissionsForUser } from "@/lib/domain/missions-service";
import { createStudyStartToken, sameStudySessionRequest, StudySessionError, validateServerStudySession, verifyStudyStartToken, type StudySessionErrorCode } from "@/lib/domain/study-session";
import { withSerializableRetry } from "@/lib/domain/transactions";
import { PET_RARITY_CONFIG } from "@/lib/pets/config";
import { applyAcademicPetProgress, hatchEggForUser, purchaseCosmeticForUser, purchaseEggForUser, setActivePetForUser, startEggIncubationForUser } from "@/lib/pets/service";
import {
  bossSchema,
  goalSchema,
  goalProgressSchema,
  gradeSchema,
  registerSchema,
  studySessionActionSchema,
  studySessionStartSchema,
  subjectSchema,
  taskSchema,
  timetableSchema,
  timetableChangeSchema,
  topicSchema,
  cosmeticPurchaseSchema,
  eggIdActionSchema,
  petIdActionSchema,
  petPurchaseSchema,
} from "@/lib/validation";

export type AuthFormState = { error?: string } | undefined;
export type PetActionState = { error?: string; success?: string };
export type StudySessionActionState = { error?: string; success?: string };
export type StudyStartResult = { ok: true; requestId: string; startedAt: string; startToken: string } | { ok: false; error: string };

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function studyTokenSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new StudySessionError("AUTH_SECRET_MISSING");
  return secret;
}

const studySessionMessages: Record<StudySessionErrorCode, string> = {
  AUTH_SECRET_MISSING: "La sesión segura no está configurada en el servidor.",
  INVALID_START_TOKEN: "No se pudo validar el inicio de la sesión.",
  START_TOKEN_USER_MISMATCH: "La sesión no pertenece a tu cuenta.",
  START_TOKEN_REQUEST_MISMATCH: "La petición de sesión no es válida.",
  START_TOKEN_PLAN_MISMATCH: "La duración de la sesión ha cambiado; vuelve a empezar.",
  STUDY_START_IN_FUTURE: "La sesión no puede empezar en el futuro.",
  STUDY_SESSION_TOO_SHORT: "La sesión debe durar al menos un minuto.",
  STUDY_SESSION_TOO_LONG: "La sesión ha superado la duración planificada.",
  STUDY_MINUTES_EXCEED_ELAPSED: "Los minutos indicados superan el tiempo medido por el servidor.",
  STUDY_MINUTES_EXCEED_PLAN: "Los minutos indicados superan la duración planificada.",
};

function studySessionError(error: unknown): StudySessionActionState {
  const code = error instanceof StudySessionError ? error.code : "INVALID_START_TOKEN";
  return { error: studySessionMessages[code] };
}

function isStudySessionDuplicate(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && String(error.meta?.target ?? "").includes("requestId");
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
  revalidatePath("/app/subjects");
}

export async function updateSubject(formData: FormData) {
  const userId = await requireUserId();
  const id = z.string().cuid().parse(String(formData.get("id") ?? ""));
  const data = subjectSchema.parse(formObject(formData));
  await prisma.subject.updateMany({ where: { id, userId }, data });
  revalidatePath("/app");
  revalidatePath("/app/subjects");
  revalidatePath(`/app/subjects/${id}`);
}

export async function deleteSubject(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  await prisma.subject.deleteMany({ where: { id, userId } });
  revalidatePath("/app");
  revalidatePath("/app/subjects");
}

export async function createTopic(formData: FormData) {
  const userId = await requireUserId();
  const data = topicSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.topic.create({ data: { ...data, userId } });
  revalidatePath("/app/subjects");
}

export async function updateTopic(formData: FormData) {
  const userId = await requireUserId();
  const id = z.string().cuid().parse(String(formData.get("id") ?? ""));
  const data = topicSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.topic.updateMany({ where: { id, userId }, data });
  revalidatePath("/app/subjects");
  revalidatePath(`/app/subjects/${data.subjectId}`);
}

export async function deleteTopic(formData: FormData) {
  const userId = await requireUserId();
  const id = z.string().cuid().parse(String(formData.get("id") ?? ""));
  await prisma.topic.deleteMany({ where: { id, userId } });
  revalidatePath("/app/subjects");
}

export async function createTimetableEntry(formData: FormData) {
  const userId = await requireUserId();
  const data = timetableSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.timetableEntry.create({ data: { ...data, userId } });
  revalidatePath("/app/timetable");
  revalidatePath("/app");
}

export async function createTimetableChange(formData: FormData) {
  const userId = await requireUserId();
  const data = timetableChangeSchema.parse(formObject(formData));
  const { id: _id, ...changeData } = data;
  void _id;
  await ensureOwnedSubject(userId, changeData.subjectId);
  if (changeData.baseEntryId) {
    const baseEntry = await prisma.timetableEntry.findFirst({ where: { id: changeData.baseEntryId, userId }, select: { id: true, subjectId: true } });
    if (!baseEntry || baseEntry.subjectId !== changeData.subjectId) throw new Error("INVALID_TIMETABLE_ENTRY");
  }
  await prisma.timetableChange.create({ data: { ...changeData, userId } });
  revalidatePath("/app/timetable");
  revalidatePath("/app");
}

export async function updateTimetableChange(formData: FormData) {
  const userId = await requireUserId();
  const id = z.string().cuid().parse(String(formData.get("id") ?? ""));
  const data = timetableChangeSchema.parse(formObject(formData));
  const { id: _ignoredId, ...changeData } = data;
  void _ignoredId;
  await ensureOwnedSubject(userId, changeData.subjectId);
  if (changeData.baseEntryId) {
    const baseEntry = await prisma.timetableEntry.findFirst({ where: { id: changeData.baseEntryId, userId }, select: { id: true, subjectId: true } });
    if (!baseEntry || baseEntry.subjectId !== changeData.subjectId) throw new Error("INVALID_TIMETABLE_ENTRY");
  }
  await prisma.timetableChange.updateMany({ where: { id, userId }, data: changeData });
  revalidatePath("/app/timetable");
  revalidatePath("/app");
}

export async function deleteTimetableChange(formData: FormData) {
  const userId = await requireUserId();
  const id = z.string().cuid().parse(String(formData.get("id") ?? ""));
  await prisma.timetableChange.deleteMany({ where: { id, userId } });
  revalidatePath("/app/timetable");
  revalidatePath("/app");
}

export async function updateTimetableEntry(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const data = timetableSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.timetableEntry.updateMany({ where: { id, userId }, data });
  revalidatePath("/app/timetable");
  revalidatePath("/app");
}

export async function deleteTimetableEntry(formData: FormData) {
  const userId = await requireUserId();
  await prisma.timetableEntry.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId } });
  revalidatePath("/app/timetable");
  revalidatePath("/app");
}

export async function createTask(formData: FormData) {
  const userId = await requireUserId();
  const data = taskSchema.parse(formObject(formData));
  const subjectId = await ensureOwnedSubject(userId, data.subjectId);
  await prisma.task.create({ data: { ...data, status: data.status === "COMPLETED" ? "PENDING" : data.status, subjectId, userId } });
  revalidatePath("/app");
  revalidatePath("/app/tasks");
}

export async function updateTask(formData: FormData) {
  const userId = await requireUserId();
  const id = z.string().cuid().parse(String(formData.get("id") ?? ""));
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) return;
  const data = taskSchema.parse(formObject(formData));
  const schedule = canRescheduleTask(existing, data.dueDate, new Date());
  if (!schedule.allowed) {
    redirect(`/app/tasks?error=${schedule.reason === "OVERDUE_FIXED_DEADLINE" ? "overdue-fixed-deadline" : "fixed-deadline-date"}`);
  }
  if (existing.status === "COMPLETED" && data.status !== "COMPLETED") redirect("/app/tasks?error=completed-task");
  const subjectId = await ensureOwnedSubject(userId, data.subjectId);
  const completedAt = existing.completedAt ?? (data.status === "COMPLETED" ? new Date() : null);
  const newlyCompleted = existing.status !== "COMPLETED" && data.status === "COMPLETED";
  if (newlyCompleted) {
    const reward = taskCompletionReward();
    await withSerializableRetry(() => prisma.$transaction(async (tx) => {
      const updated = await tx.task.updateMany({ where: { id, userId, status: { not: "COMPLETED" } }, data: { ...data, subjectId, completedAt } });
      if (updated.count !== 1) return;
      await tx.user.update({ where: { id: userId }, data: { xp: { increment: reward.xp }, coins: { increment: reward.coins } } });
      await applyAcademicPetProgress(tx, userId, reward.xp);
    }, { isolationLevel: "Serializable" }));
    await refreshDailyMissionsForUser(userId);
  } else {
    await prisma.task.updateMany({ where: { id, userId }, data: { ...data, subjectId, completedAt } });
  }
  revalidatePath("/app");
  revalidatePath("/app/tasks");
  if (subjectId) revalidatePath(`/app/subjects/${subjectId}`);
}

export async function completeTask(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const reward = taskCompletionReward();
  const completed = await withSerializableRetry(() => prisma.$transaction(async (tx) => {
    const task = await tx.task.updateMany({ where: { id, userId, status: { not: "COMPLETED" } }, data: { status: "COMPLETED", completedAt: new Date() } });
    if (task.count !== 1) return null;
    await tx.user.update({ where: { id: userId }, data: { xp: { increment: reward.xp }, coins: { increment: reward.coins } } });
    return applyAcademicPetProgress(tx, userId, reward.xp);
  }, { isolationLevel: "Serializable" }));
  if (!completed) return;
  await refreshDailyMissionsForUser(userId);
  revalidatePath("/app");
  revalidatePath("/app/pets");
  if (completed.evolved) redirect("/app?notice=pet-evolution");
  if (completed.leveledUp) redirect("/app?notice=pet-level");
}

export async function deleteTask(formData: FormData) {
  const userId = await requireUserId();
  await prisma.task.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId } });
  revalidatePath("/app");
  revalidatePath("/app/tasks");
}

export async function createBoss(formData: FormData) {
  const userId = await requireUserId();
  const data = bossSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.boss.create({ data: { ...data, userId } });
  revalidatePath("/app/bosses");
}

export async function updateBoss(formData: FormData) {
  const userId = await requireUserId();
  const id = z.string().cuid().parse(String(formData.get("id") ?? ""));
  const data = bossSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.boss.updateMany({ where: { id, userId }, data });
  revalidatePath("/app");
  revalidatePath("/app/bosses");
  revalidatePath(`/app/subjects/${data.subjectId}`);
}

export async function deleteBoss(formData: FormData) {
  const userId = await requireUserId();
  await prisma.boss.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId } });
  revalidatePath("/app");
  revalidatePath("/app/bosses");
}

export async function createGrade(formData: FormData) {
  const userId = await requireUserId();
  const data = gradeSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.grade.create({ data: { ...data, userId } });
  revalidatePath("/app/grades");
}

export async function updateGrade(formData: FormData) {
  const userId = await requireUserId();
  const id = z.string().cuid().parse(String(formData.get("id") ?? ""));
  const data = gradeSchema.parse(formObject(formData));
  await ensureOwnedSubject(userId, data.subjectId);
  await prisma.grade.updateMany({ where: { id, userId }, data });
  revalidatePath("/app/grades");
  revalidatePath(`/app/subjects/${data.subjectId}`);
}

export async function deleteGrade(formData: FormData) {
  const userId = await requireUserId();
  await prisma.grade.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId } });
  revalidatePath("/app/grades");
}

export async function createGoal(formData: FormData) {
  const userId = await requireUserId();
  const data = goalSchema.parse(formObject(formData));
  const subjectId = await ensureOwnedSubject(userId, data.subjectId);
  await prisma.goal.create({ data: { ...data, subjectId, isComplete: data.progress === 100, userId } });
  revalidatePath("/app/goals");
}

export async function updateGoalDetails(formData: FormData) {
  const userId = await requireUserId();
  const id = z.string().cuid().parse(String(formData.get("id") ?? ""));
  const data = goalSchema.parse(formObject(formData));
  const subjectId = await ensureOwnedSubject(userId, data.subjectId);
  await prisma.goal.updateMany({ where: { id, userId }, data: { ...data, subjectId, isComplete: data.progress === 100 } });
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

export async function startStudySession(plannedMinutes: number): Promise<StudyStartResult> {
  const userId = await requireUserId();
  const parsed = studySessionStartSchema.safeParse({ plannedMinutes });
  if (!parsed.success) return { ok: false, error: "La duración de la sesión no es válida." };
  try {
    const requestId = randomUUID();
    const startedAt = new Date();
    return { ok: true, requestId, startedAt: startedAt.toISOString(), startToken: createStudyStartToken({ userId, requestId, startedAt, plannedMinutes: parsed.data.plannedMinutes }, studyTokenSecret()) };
  } catch (error) {
    if (error instanceof StudySessionError) return { ok: false, error: studySessionMessages[error.code] };
    throw error;
  }
}

export async function recordStudySession(_state: StudySessionActionState, formData: FormData): Promise<StudySessionActionState> {
  const userId = await requireUserId();
  const parsed = studySessionActionSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "No se pudo validar la sesión. Vuelve a iniciar el temporizador." };
  const data = parsed.data;
  let sessionData;
  try {
    const start = verifyStudyStartToken(data.startToken, studyTokenSecret(), { userId, requestId: data.requestId, plannedMinutes: data.plannedMinutes });
    sessionData = validateServerStudySession({ startedAt: start.startedAt, plannedMinutes: start.plannedMinutes, actualMinutes: data.actualMinutes }, new Date());
  } catch (error) {
    return studySessionError(error);
  }

  const subjectId = await ensureOwnedSubject(userId, data.subjectId);
  let taskId = data.taskId;
  if (taskId && !(await prisma.task.findFirst({ where: { id: taskId, userId }, select: { id: true } }))) taskId = null;
  const reward = rewardsForStudyMinutes(sessionData.actualMinutes);
  try {
    const petProgress = await withSerializableRetry(() => prisma.$transaction(async (tx) => {
      await tx.studySession.create({ data: { ...sessionData, requestId: data.requestId, subjectId, taskId, userId } });
      await tx.user.update({ where: { id: userId }, data: { xp: { increment: reward.xp }, coins: { increment: reward.coins } } });
      return applyAcademicPetProgress(tx, userId, reward.xp);
    }, { isolationLevel: "Serializable" }));
    await refreshDailyMissionsForUser(userId);
    redirect("/app?notice=" + (petProgress.evolved ? "pet-evolution" : petProgress.leveledUp ? "pet-level" : "study-reward"));
  } catch (error) {
    if (!isStudySessionDuplicate(error)) throw error;
    const existing = await prisma.studySession.findFirst({ where: { userId, requestId: data.requestId } });
    if (!existing || !sameStudySessionRequest(existing, { ...sessionData, subjectId, taskId })) {
      return { error: "La misma petición se ha usado con datos diferentes." };
    }
    await refreshDailyMissionsForUser(userId);
    return { success: "La sesión ya estaba guardada; no se han repetido las recompensas." };
  }
}

function petActionError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  return {
    error: ({
      FORBIDDEN: "No se ha encontrado esta mascota.",
      INSUFFICIENT_COINS: "No tienes suficientes monedas.",
      EGG_NOT_AVAILABLE: "Ese huevo ya no está disponible para incubar.",
      EGG_NOT_READY: "El huevo todavía necesita más XP académico.",
      COSMETIC_NOT_AVAILABLE: "Ese cosmético ya no está disponible.",
      IDEMPOTENCY_CONFLICT: "La operación ya existe con otros datos.",
      INVALID_REQUEST_ID: "No se pudo validar la operación. Inténtalo de nuevo.",
    } as Record<string, string>)[code] ?? "No se pudo completar la operación.",
  };
}

export async function purchaseEggAction(_state: PetActionState, formData: FormData): Promise<PetActionState> {
  const userId = await requireUserId();
  try {
    const data = petPurchaseSchema.parse(Object.fromEntries(formData.entries()));
    const result = await purchaseEggForUser(userId, data.eggTypeSlug, data.requestId);
    revalidatePath("/app");
    revalidatePath("/app/pets");
    return { success: result.duplicate ? "La compra ya estaba aplicada." : "Huevo añadido al inventario." };
  } catch (error) {
    return petActionError(error);
  }
}

export async function startEggIncubationAction(_state: PetActionState, formData: FormData): Promise<PetActionState> {
  const userId = await requireUserId();
  try {
    const { eggId } = eggIdActionSchema.parse(Object.fromEntries(formData.entries()));
    await startEggIncubationForUser(userId, eggId);
    revalidatePath("/app/pets");
    return { success: "Incubación iniciada. El XP académico hará el resto." };
  } catch (error) {
    return petActionError(error);
  }
}

export async function hatchEggAction(_state: PetActionState, formData: FormData): Promise<PetActionState> {
  const userId = await requireUserId();
  try {
    const { eggId } = eggIdActionSchema.parse(Object.fromEntries(formData.entries()));
    const result = await hatchEggForUser(userId, eggId);
    revalidatePath("/app");
    revalidatePath("/app/pets");
    return { success: result.duplicate ? "Duplicado convertido en " + result.fragmentQuantity + " fragmento." : result.speciesName + " ha eclosionado · " + PET_RARITY_CONFIG[result.rarity].label + "." };
  } catch (error) {
    return petActionError(error);
  }
}

export async function setActivePetAction(_state: PetActionState, formData: FormData): Promise<PetActionState> {
  const userId = await requireUserId();
  try {
    const { petId } = petIdActionSchema.parse(Object.fromEntries(formData.entries()));
    await setActivePetForUser(userId, petId);
    revalidatePath("/app");
    revalidatePath("/app/pets");
    revalidatePath("/app/account");
    return { success: "Mascota activa actualizada." };
  } catch (error) {
    return petActionError(error);
  }
}

export async function purchaseCosmeticAction(_state: PetActionState, formData: FormData): Promise<PetActionState> {
  const userId = await requireUserId();
  try {
    const data = cosmeticPurchaseSchema.parse(Object.fromEntries(formData.entries()));
    const result = await purchaseCosmeticForUser(userId, data.cosmeticSlug, data.requestId);
    revalidatePath("/app/pets");
    return { success: result.duplicate ? "La compra ya estaba aplicada." : "Cosmético añadido al inventario." };
  } catch (error) {
    return petActionError(error);
  }
}
