import { requireUserId } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { StudyTimer } from "@/components/study-timer";
import { prisma } from "@/lib/prisma";

export default async function StudyPage({ searchParams }: { searchParams: Promise<{ task?: string; minutes?: string }> }) {
  const userId = await requireUserId();
  const params = await searchParams;
  const [subjects, tasks] = await Promise.all([
    prisma.subject.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.task.findMany({ where: { userId, status: { not: "COMPLETED" } }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const minutes = Math.max(15, Math.min(90, Number(params.minutes) || 25));
  return <div className="mx-auto max-w-5xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Modo concentración" title="Estudiar" description="Al iniciar, la interfaz oculta navegación y elementos secundarios." /><StudyTimer subjects={subjects} tasks={tasks} initialMinutes={minutes} initialTaskId={params.task} /></div>;
}
