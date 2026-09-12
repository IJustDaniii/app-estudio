import { prisma } from "@/lib/prisma";

type MaterialReferences = {
  subjectId: string | null;
  topicId: string | null;
  taskId: string | null;
  bossId: string | null;
  isCompletedExam: boolean;
};

export async function ensureOwnedMaterialReferences(userId: string, values: MaterialReferences) {
  const [subject, topic, task, boss] = await Promise.all([
    values.subjectId ? prisma.subject.findFirst({ where: { id: values.subjectId, userId }, select: { id: true } }) : null,
    values.topicId ? prisma.topic.findFirst({ where: { id: values.topicId, userId }, select: { id: true, subjectId: true } }) : null,
    values.taskId ? prisma.task.findFirst({ where: { id: values.taskId, userId }, select: { id: true } }) : null,
    values.bossId ? prisma.boss.findFirst({ where: { id: values.bossId, userId }, select: { id: true } }) : null,
  ]);

  if ((values.subjectId && !subject) || (values.topicId && !topic) || (values.taskId && !task) || (values.bossId && !boss)) {
    throw new Error("INVALID_MATERIAL_REFERENCE");
  }
  if (topic && values.subjectId && topic.subjectId !== values.subjectId) throw new Error("TOPIC_SUBJECT_MISMATCH");
  if (values.isCompletedExam && !boss) throw new Error("COMPLETED_EXAM_REQUIRES_BOSS");

  return { ...values, subjectId: values.subjectId ?? topic?.subjectId ?? null };
}
