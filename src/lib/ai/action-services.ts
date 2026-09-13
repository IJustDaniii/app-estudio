import type { Prisma } from "@prisma/client";
import type { ParsedAIAction } from "@/lib/ai/action-contract";
import { prisma } from "@/lib/prisma";
import { ensureTimetableEntrySubjectChangeAllowed } from "@/lib/domain/timetable-rules";
import { ensureAcademicEntitySubjectChangeAllowed, ensureOwnedMaterialReferences } from "@/lib/materials/references";
import { deleteMaterialWithCompensation } from "@/lib/materials/service";
import { getStorageProvider } from "@/lib/materials/storage";
import { materialMetadataSchema } from "@/lib/validation";

type Database = typeof prisma | Prisma.TransactionClient;
type SubjectColor = "slate" | "blue" | "green" | "amber" | "rose" | "violet" | "cyan" | "orange";

async function ownedSubject(db: Database, userId: string, subjectId: string | null | undefined) {
  if (!subjectId) return null;
  const subject = await db.subject.findFirst({ where: { id: subjectId, userId }, select: { id: true } });
  if (!subject) throw new Error("AI_ACTION_NOT_FOUND");
  return subject.id;
}

async function owned(db: Database, userId: string, model: "subject" | "topic" | "task" | "boss" | "grade" | "goal" | "timetableEntry" | "material", id: string) {
  const row = model === "subject"
    ? await db.subject.findFirst({ where: { id, userId }, select: { id: true } })
    : model === "topic"
      ? await db.topic.findFirst({ where: { id, userId }, select: { id: true } })
      : model === "task"
        ? await db.task.findFirst({ where: { id, userId }, select: { id: true } })
        : model === "boss"
          ? await db.boss.findFirst({ where: { id, userId }, select: { id: true } })
          : model === "grade"
            ? await db.grade.findFirst({ where: { id, userId }, select: { id: true } })
            : model === "goal"
              ? await db.goal.findFirst({ where: { id, userId }, select: { id: true } })
              : model === "timetableEntry"
                ? await db.timetableEntry.findFirst({ where: { id, userId }, select: { id: true } })
                : await db.material.findFirst({ where: { id, userId }, select: { id: true } });
  if (!row) throw new Error("AI_ACTION_NOT_FOUND");
  return row.id;
}

function actionData(value: Record<string, unknown>) {
  const copy = { ...value };
  delete copy.id;
  return copy;
}

function updateResult(count: number) {
  if (!count) throw new Error("AI_ACTION_NOT_FOUND");
  return { updated: true };
}

export async function executeAIAction(db: Database, userId: string, input: ParsedAIAction): Promise<Record<string, unknown>> {
  const value = input.arguments;
  if (input.action === "create_calendar_entry" || input.action === "update_calendar_entry" || input.action === "delete_calendar_entry") {
    const kind = value.kind;
    if (kind !== "task" && kind !== "boss" && kind !== "goal") throw new Error("AI_ACTION_INVALID_CALENDAR_KIND");
    const prefix = input.action.split("_")[0];
    const nested = `${prefix}_${kind}`;
    const { parseAIAction } = await import("@/lib/ai/action-contract");
    return executeAIAction(db, userId, parseAIAction(nested, value.data));
  }

  switch (input.action) {
    case "create_subject": {
      const data = value as { name: string; color: SubjectColor };
      return db.subject.create({ data: { name: data.name, color: data.color, userId }, select: { id: true, name: true } });
    }
    case "update_subject": {
      await owned(db, userId, "subject", value.id as string);
      return updateResult((await db.subject.updateMany({ where: { id: value.id as string, userId }, data: actionData(value) as Prisma.SubjectUpdateManyMutationInput })).count);
    }
    case "delete_subject":
      await owned(db, userId, "subject", value.id as string);
      await db.subject.delete({ where: { id: value.id as string } });
      return { deleted: true };

    case "create_topic": {
      const data = value as { name: string; subjectId: string };
      await ownedSubject(db, userId, data.subjectId);
      return db.topic.create({ data: { name: data.name, subjectId: data.subjectId, userId }, select: { id: true, name: true } });
    }
    case "update_topic": {
      const existing = await db.topic.findFirst({ where: { id: value.id as string, userId }, select: { id: true, subjectId: true } });
      if (!existing) throw new Error("AI_ACTION_NOT_FOUND");
      if (value.subjectId !== undefined) {
        await ownedSubject(db, userId, value.subjectId as string | null);
        await ensureAcademicEntitySubjectChangeAllowed(userId, "topicId", existing.id, existing.subjectId, value.subjectId as string | null, db);
      }
      return updateResult((await db.topic.updateMany({ where: { id: value.id as string, userId }, data: actionData(value) as Prisma.TopicUpdateManyMutationInput })).count);
    }
    case "delete_topic":
      await owned(db, userId, "topic", value.id as string);
      await db.topic.delete({ where: { id: value.id as string } });
      return { deleted: true };

    case "create_task": {
      const data = value as { subjectId?: string | null; [key: string]: unknown };
      const subjectId = await ownedSubject(db, userId, data.subjectId);
      return db.task.create({ data: { ...actionData(data), subjectId, userId } as Prisma.TaskUncheckedCreateInput, select: { id: true, title: true, status: true } });
    }
    case "update_task": {
      const existing = await db.task.findFirst({ where: { id: value.id as string, userId }, select: { id: true, subjectId: true } });
      if (!existing) throw new Error("AI_ACTION_NOT_FOUND");
      if (value.subjectId !== undefined) {
        await ownedSubject(db, userId, value.subjectId as string | null);
        await ensureAcademicEntitySubjectChangeAllowed(userId, "taskId", existing.id, existing.subjectId, value.subjectId as string | null, db);
      }
      return updateResult((await db.task.updateMany({ where: { id: value.id as string, userId }, data: actionData(value) as Prisma.TaskUpdateManyMutationInput })).count);
    }
    case "delete_task":
      await owned(db, userId, "task", value.id as string);
      await db.task.delete({ where: { id: value.id as string } });
      return { deleted: true };

    case "create_boss": {
      const data = value as { subjectId: string; [key: string]: unknown };
      await ownedSubject(db, userId, data.subjectId);
      return db.boss.create({ data: { ...actionData(data), userId } as Prisma.BossUncheckedCreateInput, select: { id: true, title: true } });
    }
    case "update_boss": {
      const existing = await db.boss.findFirst({ where: { id: value.id as string, userId }, select: { id: true, subjectId: true } });
      if (!existing) throw new Error("AI_ACTION_NOT_FOUND");
      if (value.subjectId !== undefined) {
        await ownedSubject(db, userId, value.subjectId as string | null);
        await ensureAcademicEntitySubjectChangeAllowed(userId, "bossId", existing.id, existing.subjectId, value.subjectId as string | null, db);
      }
      return updateResult((await db.boss.updateMany({ where: { id: value.id as string, userId }, data: actionData(value) as Prisma.BossUpdateManyMutationInput })).count);
    }
    case "delete_boss":
      await owned(db, userId, "boss", value.id as string);
      await db.boss.delete({ where: { id: value.id as string } });
      return { deleted: true };

    case "create_grade": {
      const data = value as { subjectId: string; [key: string]: unknown };
      await ownedSubject(db, userId, data.subjectId);
      return db.grade.create({ data: { ...actionData(data), userId } as Prisma.GradeUncheckedCreateInput, select: { id: true, label: true, value: true } });
    }
    case "update_grade": {
      await owned(db, userId, "grade", value.id as string);
      if (value.subjectId) await ownedSubject(db, userId, value.subjectId as string);
      return updateResult((await db.grade.updateMany({ where: { id: value.id as string, userId }, data: actionData(value) as Prisma.GradeUpdateManyMutationInput })).count);
    }
    case "delete_grade":
      await owned(db, userId, "grade", value.id as string);
      await db.grade.delete({ where: { id: value.id as string } });
      return { deleted: true };

    case "create_goal":
      return db.goal.create({ data: { ...actionData(value), isComplete: (value.progress as number) === 100, userId } as Prisma.GoalUncheckedCreateInput, select: { id: true, title: true, progress: true } });
    case "update_goal": {
      await owned(db, userId, "goal", value.id as string);
      const data = actionData(value);
      if (data.progress !== undefined) data.isComplete = data.progress === 100;
      return updateResult((await db.goal.updateMany({ where: { id: value.id as string, userId }, data: data as Prisma.GoalUpdateManyMutationInput })).count);
    }
    case "delete_goal":
      await owned(db, userId, "goal", value.id as string);
      await db.goal.delete({ where: { id: value.id as string } });
      return { deleted: true };

    case "create_timetable": {
      const data = value as { subjectId: string; [key: string]: unknown };
      await ownedSubject(db, userId, data.subjectId);
      return db.timetableEntry.create({ data: { ...actionData(data), userId } as Prisma.TimetableEntryUncheckedCreateInput, select: { id: true, dayOfWeek: true, startTime: true, endTime: true } });
    }
    case "update_timetable": {
      const existing = await db.timetableEntry.findFirst({ where: { id: value.id as string, userId }, select: { id: true, subjectId: true } });
      if (!existing) throw new Error("AI_ACTION_NOT_FOUND");
      if (value.subjectId) {
        await ownedSubject(db, userId, value.subjectId as string);
        await ensureTimetableEntrySubjectChangeAllowed(db, userId, existing.id, existing.subjectId, value.subjectId as string);
      }
      return updateResult((await db.timetableEntry.updateMany({ where: { id: value.id as string, userId }, data: actionData(value) as Prisma.TimetableEntryUpdateManyMutationInput })).count);
    }
    case "delete_timetable":
      await owned(db, userId, "timetableEntry", value.id as string);
      await db.timetableEntry.delete({ where: { id: value.id as string } });
      return { deleted: true };

    case "update_material_metadata": {
      const material = await db.material.findFirst({ where: { id: value.id as string, userId }, select: { id: true, name: true, description: true, type: true, subjectId: true, topicId: true, taskId: true, bossId: true, isFavorite: true, isCompletedExam: true } });
      if (!material) throw new Error("AI_ACTION_NOT_FOUND");
      const validated = materialMetadataSchema.parse({ ...material, ...actionData(value), description: value.description === null ? "" : value.description ?? material.description ?? "" });
      const references = await ensureOwnedMaterialReferences(userId, { subjectId: validated.subjectId, topicId: validated.topicId, taskId: validated.taskId, bossId: validated.bossId, isCompletedExam: validated.isCompletedExam }, db);
      return updateResult((await db.material.updateMany({ where: { id: material.id, userId }, data: { name: validated.name, description: validated.description, type: validated.type, isFavorite: validated.isFavorite, isCompletedExam: validated.isCompletedExam, subjectId: references.subjectId, topicId: references.topicId, taskId: references.taskId, bossId: references.bossId } })).count);
    }
    case "delete_material_metadata": {
      const material = await db.material.findFirst({ where: { id: value.id as string, userId }, select: { id: true, storageKey: true } });
      if (!material) throw new Error("AI_ACTION_NOT_FOUND");
      await deleteMaterialWithCompensation(getStorageProvider(), material.storageKey, async () => {
        await db.material.delete({ where: { id: material.id } });
      });
      return { deleted: true };
    }
    case "create_material_metadata":
    case "create_study_session":
    case "update_study_session":
    case "delete_study_session":
      throw new Error("AI_ACTION_FORBIDDEN");
  }
}
