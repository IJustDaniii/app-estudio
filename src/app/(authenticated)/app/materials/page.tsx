import { MaterialManager } from "@/components/material-manager";
import { PageHeader } from "@/components/page-header";
import { requireUserId } from "@/auth";
import { prisma } from "@/lib/prisma";
import { materialIdSchema } from "@/lib/validation";

type MaterialsPageProps = { searchParams: Promise<{ subjectId?: string; taskId?: string; bossId?: string }> };

export default async function MaterialsPage({ searchParams }: MaterialsPageProps) {
  const userId = await requireUserId();
  const params = await searchParams;
  const subjectId = materialIdSchema.safeParse(params.subjectId).data;
  const taskId = materialIdSchema.safeParse(params.taskId).data;
  const bossId = materialIdSchema.safeParse(params.bossId).data;
  const materialScope = taskId ? { taskId } : bossId ? { bossId } : subjectId ? { subjectId } : {};
  const [materials, subjects, topics, tasks, bosses] = await Promise.all([
    prisma.material.findMany({ where: { userId, ...materialScope }, include: { subject: { select: { name: true } }, topic: { select: { name: true } }, task: { select: { title: true } }, boss: { select: { title: true } } }, orderBy: { uploadedAt: "desc" } }),
    prisma.subject.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.topic.findMany({ where: { userId }, select: { id: true, name: true, subjectId: true, subject: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.task.findMany({ where: { userId }, select: { id: true, title: true, subjectId: true }, orderBy: { createdAt: "desc" } }),
    prisma.boss.findMany({ where: { userId }, select: { id: true, title: true, subjectId: true }, orderBy: { date: "asc" } }),
  ]);
  const relatedTask = tasks.find((task) => task.id === taskId);
  const relatedBoss = bosses.find((boss) => boss.id === bossId);
  const initialMetadata = { subjectId: subjectId ?? relatedTask?.subjectId ?? relatedBoss?.subjectId ?? "", topicId: "", taskId: taskId ?? "", bossId: bossId ?? "", type: "OTHER" as const, isFavorite: false, isCompletedExam: false };
  return <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Biblioteca privada" title="Materiales" description="Tus archivos académicos privados, organizados por contexto y listos para procesamiento futuro." /><MaterialManager materials={materials.map((material) => ({ ...material, uploadedAt: material.uploadedAt.toISOString() }))} subjects={subjects.map((subject) => ({ id: subject.id, label: subject.name }))} topics={topics.map((topic) => ({ id: topic.id, label: `${topic.subject.name} · ${topic.name}`, subjectId: topic.subjectId }))} tasks={tasks.map((task) => ({ id: task.id, label: task.title }))} bosses={bosses.map((boss) => ({ id: boss.id, label: boss.title }))} initialMetadata={initialMetadata} /></div>;
}
