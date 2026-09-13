import type { Prisma } from "@prisma/client";
import type { AcademicContextRepository } from "@/lib/ai/context";
import type { ReadOnlyToolRepository } from "@/lib/ai/tools";
import type { ContextSelection } from "@/lib/ai/validation";
import { DEFAULT_AI_CONTEXT_LIMIT, DEFAULT_AI_MODEL, DEFAULT_OLLAMA_URL } from "@/lib/ai/validation";
import { prisma } from "@/lib/prisma";

export const academicContextRepository: AcademicContextRepository = {
  async subjects(userId, ids) {
    return prisma.subject.findMany({ where: { userId, id: { in: ids } }, select: { id: true, name: true } });
  },
  async tasks(userId, ids) {
    const rows = await prisma.task.findMany({ where: { userId, id: { in: ids } }, select: { id: true, title: true, status: true, dueDate: true, priority: true, notes: true, subject: { select: { name: true } } } });
    return rows.map(({ subject, ...task }) => ({ ...task, subjectName: subject?.name ?? null }));
  },
  async bosses(userId, ids) {
    const rows = await prisma.boss.findMany({ where: { userId, id: { in: ids } }, select: { id: true, title: true, date: true, topics: true, preparation: true, subject: { select: { name: true } } } });
    return rows.map(({ subject, ...boss }) => ({ ...boss, subjectName: subject.name }));
  },
  async grades(userId, ids) {
    const rows = await prisma.grade.findMany({ where: { userId, id: { in: ids } }, select: { id: true, label: true, value: true, date: true, subject: { select: { name: true } } } });
    return rows.map(({ subject, ...grade }) => ({ ...grade, subjectName: subject.name }));
  },
  async goals(userId, ids) {
    return prisma.goal.findMany({ where: { userId, id: { in: ids } }, select: { id: true, title: true, progress: true, targetDate: true, isComplete: true } });
  },
  async studySessions(userId, ids) {
    const rows = await prisma.studySession.findMany({ where: { userId, id: { in: ids } }, select: { id: true, startedAt: true, actualMinutes: true, subject: { select: { name: true } }, task: { select: { title: true } } } });
    return rows.map(({ subject, task, ...session }) => ({ ...session, subjectName: subject?.name ?? null, taskTitle: task?.title ?? null }));
  },
  async materials(userId, ids) {
    return prisma.material.findMany({ where: { userId, id: { in: ids } }, select: { id: true, name: true, mimeType: true, size: true, storageKey: true } });
  },
};

function textFilter(query?: string): Prisma.StringFilter | undefined {
  return query ? { contains: query, mode: "insensitive" } : undefined;
}

export function scopedReadOnlyToolRepository(selection: ContextSelection): ReadOnlyToolRepository {
  return {
    subjects(userId, args) {
      return prisma.subject.findMany({ where: { userId, id: { in: selection.subjectIds }, name: textFilter(args.query) }, select: { id: true, name: true, color: true }, orderBy: { name: "asc" }, take: args.limit });
    },
    tasks(userId, args) {
      return prisma.task.findMany({ where: { userId, id: { in: selection.taskIds }, ...(args.subjectId ? { subjectId: args.subjectId } : {}), title: textFilter(args.query) }, select: { id: true, title: true, status: true, priority: true, difficulty: true, dueDate: true, estimatedMinutes: true, subject: { select: { name: true } } }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take: args.limit });
    },
    bosses(userId, args) {
      return prisma.boss.findMany({ where: { userId, id: { in: selection.bossIds }, ...(args.subjectId ? { subjectId: args.subjectId } : {}), title: textFilter(args.query) }, select: { id: true, title: true, date: true, topics: true, preparation: true, targetGrade: true, expectedGrade: true, actualGrade: true, subject: { select: { name: true } } }, orderBy: { date: "asc" }, take: args.limit });
    },
    grades(userId, args) {
      return prisma.grade.findMany({ where: { userId, id: { in: selection.gradeIds }, ...(args.subjectId ? { subjectId: args.subjectId } : {}), label: textFilter(args.query) }, select: { id: true, label: true, value: true, date: true, subject: { select: { name: true } } }, orderBy: { date: "desc" }, take: args.limit });
    },
  };
}

export async function getAISettings(userId: string) {
  return (await prisma.aISettings.findUnique({ where: { userId } })) ?? {
    userId,
    provider: "OLLAMA" as const,
    ollamaUrl: DEFAULT_OLLAMA_URL,
    model: DEFAULT_AI_MODEL,
    isAcademicContextEnabled: true,
    contextLimit: DEFAULT_AI_CONTEXT_LIMIT,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

export async function getAIContextOptions(userId: string) {
  const [subjects, tasks, bosses, grades, goals, studySessions, materials] = await Promise.all([
    prisma.subject.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 100 }),
    prisma.task.findMany({ where: { userId }, select: { id: true, title: true, subject: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.boss.findMany({ where: { userId }, select: { id: true, title: true, subject: { select: { name: true } } }, orderBy: { date: "asc" }, take: 100 }),
    prisma.grade.findMany({ where: { userId }, select: { id: true, label: true, value: true, subject: { select: { name: true } } }, orderBy: { date: "desc" }, take: 100 }),
    prisma.goal.findMany({ where: { userId }, select: { id: true, title: true, progress: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.studySession.findMany({ where: { userId }, select: { id: true, actualMinutes: true, startedAt: true, subject: { select: { name: true } }, task: { select: { title: true } } }, orderBy: { startedAt: "desc" }, take: 100 }),
    prisma.material.findMany({ where: { userId }, select: { id: true, name: true, mimeType: true, subject: { select: { name: true } } }, orderBy: { uploadedAt: "desc" }, take: 100 }),
  ]);
  return {
    subjects: subjects.map((item) => ({ id: item.id, label: item.name })),
    tasks: tasks.map((item) => ({ id: item.id, label: item.subject ? `${item.title} · ${item.subject.name}` : item.title })),
    bosses: bosses.map((item) => ({ id: item.id, label: `${item.title} · ${item.subject.name}` })),
    grades: grades.map((item) => ({ id: item.id, label: `${item.label} (${item.value}) · ${item.subject.name}` })),
    goals: goals.map((item) => ({ id: item.id, label: `${item.title} · ${item.progress}%` })),
    studySessions: studySessions.map((item) => ({ id: item.id, label: `${item.actualMinutes} min · ${item.subject?.name ?? item.task?.title ?? item.startedAt.toLocaleDateString("es-ES")}` })),
    materials: materials.map((item) => ({ id: item.id, label: item.subject ? `${item.name} · ${item.subject.name}` : item.name, mimeType: item.mimeType })),
  };
}
