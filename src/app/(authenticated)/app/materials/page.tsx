import { requireUserId } from "@/auth";
import { MaterialManager } from "@/components/material-manager";
import { getMaterialUploadLimits, MATERIAL_MAX_PAGE, MATERIAL_OPTION_LIMIT, MATERIAL_PAGE_SIZE } from "@/lib/materials/constants";
import { prisma } from "@/lib/prisma";
import { materialIdSchema } from "@/lib/validation";
import { PageHeader } from "@/components/page-header";

type MaterialsPageProps = { searchParams: Promise<{ subjectId?: string; taskId?: string; bossId?: string; page?: string }> };

export default async function MaterialsPage({ searchParams }: MaterialsPageProps) {
  const userId = await requireUserId();
  const params = await searchParams;
  const subjectId = materialIdSchema.safeParse(params.subjectId).data;
  const taskId = materialIdSchema.safeParse(params.taskId).data;
  const bossId = materialIdSchema.safeParse(params.bossId).data;
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, MATERIAL_MAX_PAGE) : 1;
  const materialScope = taskId ? { taskId } : bossId ? { bossId } : subjectId ? { subjectId } : {};
  const [materials, subjects, topics, tasks, bosses] = await Promise.all([
    prisma.material.findMany({ where: { userId, ...materialScope }, include: { subject: { select: { name: true } }, topic: { select: { name: true } }, task: { select: { title: true } }, boss: { select: { title: true } } }, orderBy: { uploadedAt: "desc" }, skip: (page - 1) * MATERIAL_PAGE_SIZE, take: MATERIAL_PAGE_SIZE + 1 }),
    prisma.subject.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: MATERIAL_OPTION_LIMIT }),
    prisma.topic.findMany({ where: { userId }, select: { id: true, name: true, subjectId: true, subject: { select: { name: true } } }, orderBy: { name: "asc" }, take: MATERIAL_OPTION_LIMIT }),
    prisma.task.findMany({ where: { userId }, select: { id: true, title: true, subjectId: true }, orderBy: { createdAt: "desc" }, take: MATERIAL_OPTION_LIMIT }),
    prisma.boss.findMany({ where: { userId }, select: { id: true, title: true, subjectId: true }, orderBy: { date: "asc" }, take: MATERIAL_OPTION_LIMIT }),
  ]);
  const hasNext = materials.length > MATERIAL_PAGE_SIZE;
  const pageMaterials = materials.slice(0, MATERIAL_PAGE_SIZE);
  const relatedTask = tasks.find((task) => task.id === taskId);
  const relatedBoss = bosses.find((boss) => boss.id === bossId);
  const initialMetadata = { subjectId: subjectId ?? relatedTask?.subjectId ?? relatedBoss?.subjectId ?? "", topicId: "", taskId: taskId ?? "", bossId: bossId ?? "", type: "OTHER" as const, isFavorite: false, isCompletedExam: false };
  const context = { subjectId: subjectId ?? null, taskId: taskId ?? null, bossId: bossId ?? null };
  return <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Biblioteca privada" title="Materiales" description="Tus archivos académicos privados, organizados por contexto y listos para procesamiento futuro." /><MaterialManager materials={pageMaterials.map((material) => ({ ...material, uploadedAt: material.uploadedAt.toISOString() }))} subjects={subjects.map((subject) => ({ id: subject.id, label: subject.name }))} topics={topics.map((topic) => ({ id: topic.id, label: `${topic.subject.name} · ${topic.name}`, subjectId: topic.subjectId }))} tasks={tasks.map((task) => ({ id: task.id, label: task.title, subjectId: task.subjectId }))} bosses={bosses.map((boss) => ({ id: boss.id, label: boss.title, subjectId: boss.subjectId }))} initialMetadata={initialMetadata} page={page} hasNext={hasNext} context={context} uploadLimits={getMaterialUploadLimits()} /></div>;
}
