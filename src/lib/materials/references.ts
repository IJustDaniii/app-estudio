import type { Prisma } from "@prisma/client";
import type { MaterialTypeValue } from "@/lib/materials/constants";
import { prisma } from "@/lib/prisma";

type Database = typeof prisma | Prisma.TransactionClient;

type MaterialReferences = {
  subjectId: string | null;
  topicId: string | null;
  taskId: string | null;
  bossId: string | null;
  isFavorite?: boolean;
  isCompletedExam: boolean;
};

export type MaterialMetadataUpdate = MaterialReferences & { name: string; description: string | null; type: MaterialTypeValue; isFavorite: boolean };

export function materialMetadataUpdate(values: MaterialMetadataUpdate, references: MaterialReferences) {
  return { ...references, name: values.name, description: values.description, type: values.type, isFavorite: values.isFavorite, isCompletedExam: values.isCompletedExam };
}

export function resolveMaterialSubjectId(explicitSubjectId: string | null, referencedSubjectIds: Array<string | null | undefined>) {
  const derived = [...new Set(referencedSubjectIds.filter((value): value is string => Boolean(value)))];
  if (derived.length > 1) throw new Error("MATERIAL_SUBJECT_MISMATCH");
  if (explicitSubjectId && derived.length && explicitSubjectId !== derived[0]) throw new Error("MATERIAL_SUBJECT_MISMATCH");
  return explicitSubjectId ?? derived[0] ?? null;
}

export async function ensureOwnedMaterialReferences(userId: string, values: MaterialReferences, database: Database = prisma) {
  const [subject, topic, task, boss] = await Promise.all([
    values.subjectId ? database.subject.findFirst({ where: { id: values.subjectId, userId }, select: { id: true } }) : null,
    values.topicId ? database.topic.findFirst({ where: { id: values.topicId, userId }, select: { id: true, subjectId: true } }) : null,
    values.taskId ? database.task.findFirst({ where: { id: values.taskId, userId }, select: { id: true, subjectId: true } }) : null,
    values.bossId ? database.boss.findFirst({ where: { id: values.bossId, userId }, select: { id: true, subjectId: true } }) : null,
  ]);

  if ((values.subjectId && !subject) || (values.topicId && !topic) || (values.taskId && !task) || (values.bossId && !boss)) {
    throw new Error("INVALID_MATERIAL_REFERENCE");
  }
  if (topic && values.subjectId && topic.subjectId !== values.subjectId) throw new Error("TOPIC_SUBJECT_MISMATCH");
  if (values.isCompletedExam && !boss) throw new Error("COMPLETED_EXAM_REQUIRES_BOSS");

  return {
    ...values,
    subjectId: resolveMaterialSubjectId(values.subjectId, [topic?.subjectId, task?.subjectId, boss?.subjectId]),
  };
}
