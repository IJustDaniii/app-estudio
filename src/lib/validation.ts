import { z } from "zod";
import { MAX_STUDY_SESSION_MINUTES, MIN_STUDY_SESSION_MINUTES } from "@/lib/domain/study-session";

const emptyToNullDate = z.preprocess((value) => (value === "" ? null : value), z.coerce.date().nullable());
const optionalId = z.preprocess((value) => (value === "" ? null : value), z.string().cuid().nullable());
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const formBoolean = z.preprocess((value) => value === true || value === "true" || value === "on", z.boolean());

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
});

export const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(80),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Za-z]/, "Incluye una letra")
    .regex(/[0-9]/, "Incluye un número")
    .regex(/[^A-Za-z0-9]/, "Incluye un símbolo"),
});

export const subjectSchema = z.object({
  name: requiredText(80),
  color: z.enum(["slate", "blue", "green", "amber", "rose", "violet", "cyan", "orange"]),
});

export const topicSchema = z.object({
  name: requiredText(120),
  subjectId: z.string().cuid(),
});

export const materialMetadataSchema = z.object({
  name: requiredText(160),
  description: z.string().trim().max(2_000).optional().transform((value) => value || null),
  type: z.enum(["NOTES", "EXERCISES", "EXAM", "SOLUTIONS", "THEORY", "RUBRIC", "PROJECT", "OTHER"]),
  subjectId: optionalId,
  topicId: optionalId,
  taskId: optionalId,
  bossId: optionalId,
  isFavorite: formBoolean.default(false),
  isCompletedExam: formBoolean.default(false),
});

export const materialUploadMetadataSchema = materialMetadataSchema.omit({ name: true }).extend({
  type: z.enum(["NOTES", "EXERCISES", "EXAM", "SOLUTIONS", "THEORY", "RUBRIC", "PROJECT", "OTHER"]).default("OTHER"),
  isFavorite: formBoolean.default(false),
  isCompletedExam: formBoolean.default(false),
});

export const materialIdSchema = z.string().cuid();

export const timetableSchema = z
  .object({
    subjectId: z.string().cuid(),
    dayOfWeek: z.coerce.number().int().min(1).max(5),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    room: z.string().trim().max(40).optional().transform((value) => value || null),
  })
  .refine((data) => data.endTime > data.startTime, { message: "La hora de fin debe ser posterior" });

export const taskSchema = z
  .object({
    title: requiredText(160),
    planningMode: z.enum(["FIXED_DEADLINE", "FLEXIBLE_STUDY"]),
    type: requiredText(60),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    difficulty: z.coerce.number().int().min(1).max(5),
    dueDate: emptyToNullDate,
    estimatedMinutes: z.coerce.number().int().min(5).max(600),
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).default("PENDING"),
    notes: z.string().trim().max(2000).optional().transform((value) => value || null),
    subjectId: optionalId,
  })
  .refine((data) => data.planningMode !== "FIXED_DEADLINE" || data.dueDate !== null, {
    message: "Una obligación necesita una fecha límite real",
    path: ["dueDate"],
  });

export const bossSchema = z.object({
  title: requiredText(120),
  subjectId: z.string().cuid(),
  date: z.coerce.date(),
  topics: requiredText(1000).transform((value) => value.split("\n").map((item) => item.trim()).filter(Boolean)),
  difficulty: z.coerce.number().int().min(1).max(5),
  preparation: z.coerce.number().int().min(0).max(100),
  targetGrade: z.preprocess((value) => (value === "" ? null : value), z.coerce.number().min(0).max(10).nullable()),
  expectedGrade: z.preprocess((value) => (value === "" ? null : value), z.coerce.number().min(0).max(10).nullable()),
  actualGrade: z.preprocess((value) => (value === "" ? null : value), z.coerce.number().min(0).max(10).nullable()),
});

export const gradeSchema = z.object({
  label: requiredText(100),
  subjectId: z.string().cuid(),
  value: z.coerce.number().min(0).max(10),
  date: z.coerce.date(),
});

export const goalSchema = z.object({
  title: requiredText(160),
  targetDate: emptyToNullDate,
  progress: z.coerce.number().int().min(0).max(100),
});

export const goalProgressSchema = z.object({
  id: z.string().cuid(),
  progress: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().min(0).max(100),
  ),
});

export const studySessionSchema = z
  .object({
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date(),
    plannedMinutes: z.coerce.number().int().min(1).max(600),
    actualMinutes: z.coerce.number().int().min(1).max(720),
    subjectId: optionalId,
    taskId: optionalId,
  })
  .refine((data) => data.endedAt >= data.startedAt, {
    message: "La sesión no puede terminar antes de empezar",
    path: ["endedAt"],
  })
  .refine(
    (data) => data.actualMinutes * 60_000 <= data.endedAt.getTime() - data.startedAt.getTime() + 59_999,
    { message: "La duración registrada supera el tiempo transcurrido", path: ["actualMinutes"] },
  );

const plannedStudyMinutes = z.coerce.number().int().min(MIN_STUDY_SESSION_MINUTES).max(MAX_STUDY_SESSION_MINUTES);

export const studySessionStartSchema = z.object({
  plannedMinutes: plannedStudyMinutes,
});

export const studySessionActionSchema = z.object({
  requestId: z.string().uuid(),
  startToken: z.string().min(40).max(2_048),
  plannedMinutes: plannedStudyMinutes,
  actualMinutes: z.coerce.number().int().min(MIN_STUDY_SESSION_MINUTES).max(MAX_STUDY_SESSION_MINUTES),
  subjectId: optionalId,
  taskId: optionalId,
});

const petRequestId = z.string().regex(/^[a-zA-Z0-9:_-]{8,100}$/);

export const petPurchaseSchema = z.object({
  eggTypeSlug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  requestId: petRequestId,
});

export const cosmeticPurchaseSchema = z.object({
  cosmeticSlug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  requestId: petRequestId,
});

export const petIdActionSchema = z.object({
  petId: z.string().cuid(),
});

export const eggIdActionSchema = z.object({
  eggId: z.string().cuid(),
});

export const customPetNameSchema = z.string().trim().min(1).max(80);
