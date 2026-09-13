import type { Prisma } from "@prisma/client";
import { calculateLevel, calculateStudyStreak } from "@/lib/domain/progress";
import type { AcademicContextRepository, ContextQueryOptions } from "@/lib/ai/context";
import type { ReadOnlyToolRepository } from "@/lib/ai/tools";
import type { AIAcademicPermissions, ContextSelection } from "@/lib/ai/validation";
import { aiModelSchema, DEFAULT_AI_CONTEXT_ITEM_LIMIT, DEFAULT_AI_CONTEXT_LIMIT, DEFAULT_AI_MODEL, DEFAULT_OLLAMA_URL, ollamaUrlSchema, defaultAIAcademicPermissions } from "@/lib/ai/validation";
import { prisma } from "@/lib/prisma";

function textFilter(query?: string): Prisma.StringFilter | undefined {
  const compact = query?.trim().slice(0, 120);
  return compact ? { contains: compact, mode: "insensitive" } : undefined;
}

function idWhere(ids: string[]) {
  return ids.length ? { id: { in: ids } } : {};
}

function subjectWhere(options: ContextQueryOptions) {
  return options.subjectIds?.length ? { subjectId: { in: options.subjectIds } } : {};
}

function dateWhere(from?: Date, to?: Date) {
  return from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;
}

export const academicContextRepository: AcademicContextRepository = {
  async subjects(userId, ids, options = { limit: DEFAULT_AI_CONTEXT_ITEM_LIMIT }) {
    return prisma.subject.findMany({ where: { userId, ...idWhere(ids), name: textFilter(options.query) }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: options.limit });
  },
  async topics(userId, ids, options = { limit: DEFAULT_AI_CONTEXT_ITEM_LIMIT }) {
    const rows = await prisma.topic.findMany({ where: { userId, ...idWhere(ids), ...subjectWhere(options), name: textFilter(options.query) }, select: { id: true, name: true, subject: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: options.limit });
    return rows.map(({ subject, ...topic }) => ({ ...topic, subjectName: subject.name }));
  },
  async tasks(userId, ids, options = { limit: DEFAULT_AI_CONTEXT_ITEM_LIMIT }) {
    const rows = await prisma.task.findMany({ where: { userId, ...idWhere(ids), ...subjectWhere(options), title: textFilter(options.query), ...(options.onlyOpen ? { status: { not: "COMPLETED" } } : {}), ...(dateWhere(options.from, options.to) ? { dueDate: dateWhere(options.from, options.to) } : {}) }, select: { id: true, title: true, status: true, dueDate: true, priority: true, notes: true, subject: { select: { name: true } } }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take: options.limit });
    return rows.map(({ subject, ...task }) => ({ ...task, subjectName: subject?.name ?? null }));
  },
  async bosses(userId, ids, options = { limit: DEFAULT_AI_CONTEXT_ITEM_LIMIT }) {
    const rows = await prisma.boss.findMany({ where: { userId, ...idWhere(ids), ...subjectWhere(options), title: textFilter(options.query), ...(dateWhere(options.from, options.to) ? { date: dateWhere(options.from, options.to) } : {}) }, select: { id: true, title: true, date: true, topics: true, preparation: true, subject: { select: { name: true } } }, orderBy: { date: "asc" }, take: options.limit });
    return rows.map(({ subject, ...boss }) => ({ ...boss, subjectName: subject.name }));
  },
  async grades(userId, ids, options = { limit: DEFAULT_AI_CONTEXT_ITEM_LIMIT }) {
    const rows = await prisma.grade.findMany({ where: { userId, ...idWhere(ids), ...subjectWhere(options), label: textFilter(options.query) }, select: { id: true, label: true, value: true, date: true, subject: { select: { name: true } } }, orderBy: { date: "desc" }, take: options.limit });
    return rows.map(({ subject, ...grade }) => ({ ...grade, subjectName: subject.name }));
  },
  async goals(userId, ids, options = { limit: DEFAULT_AI_CONTEXT_ITEM_LIMIT }) {
    return prisma.goal.findMany({ where: { userId, ...idWhere(ids), title: textFilter(options.query), ...(dateWhere(options.from, options.to) ? { targetDate: dateWhere(options.from, options.to) } : {}) }, select: { id: true, title: true, progress: true, targetDate: true, isComplete: true }, orderBy: [{ isComplete: "asc" }, { targetDate: "asc" }], take: options.limit });
  },
  async studySessions(userId, ids, options = { limit: DEFAULT_AI_CONTEXT_ITEM_LIMIT }) {
    const rows = await prisma.studySession.findMany({ where: { userId, ...idWhere(ids), ...subjectWhere(options), ...(dateWhere(options.from, options.to) ? { startedAt: dateWhere(options.from, options.to) } : {}) }, select: { id: true, startedAt: true, actualMinutes: true, subject: { select: { name: true } }, task: { select: { title: true } } }, orderBy: { startedAt: "desc" }, take: options.limit });
    return rows.map(({ subject, task, ...session }) => ({ ...session, subjectName: subject?.name ?? null, taskTitle: task?.title ?? null }));
  },
  async schedule(userId, options) {
    const rows = await prisma.timetableEntry.findMany({ where: { userId, ...(options.dayOfWeek ? { dayOfWeek: options.dayOfWeek } : {}) }, select: { id: true, dayOfWeek: true, startTime: true, endTime: true, room: true, subject: { select: { name: true } } }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }], take: options.limit });
    return rows.map(({ subject, ...entry }) => ({ ...entry, subjectName: subject.name }));
  },
  async calendar(userId, options) {
    const [tasks, bosses, goals] = await Promise.all([
      prisma.task.findMany({ where: { userId, dueDate: dateWhere(options.from, options.to) }, select: { id: true, title: true, dueDate: true, subject: { select: { name: true } } }, take: options.limit }),
      prisma.boss.findMany({ where: { userId, date: dateWhere(options.from, options.to) }, select: { id: true, title: true, date: true, subject: { select: { name: true } } }, take: options.limit }),
      prisma.goal.findMany({ where: { userId, targetDate: dateWhere(options.from, options.to) }, select: { id: true, title: true, targetDate: true }, take: options.limit }),
    ]);
    return [
      ...tasks.filter((item) => item.dueDate).map((item) => ({ id: item.id, type: "task" as const, title: item.title, date: item.dueDate!, subjectName: item.subject?.name })),
      ...bosses.map((item) => ({ id: item.id, type: "boss" as const, title: item.title, date: item.date, subjectName: item.subject.name })),
      ...goals.filter((item) => item.targetDate).map((item) => ({ id: item.id, type: "goal" as const, title: item.title, date: item.targetDate! })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, options.limit);
  },
  async statistics(userId, options) {
    const sessionWhere = { userId, ...(dateWhere(options.from, options.to) ? { startedAt: dateWhere(options.from, options.to) } : {}) };
    const [total, sessions, completedTasks, subjectRows] = await Promise.all([
      prisma.studySession.aggregate({ where: sessionWhere, _sum: { actualMinutes: true } }),
      prisma.studySession.count({ where: sessionWhere }),
      prisma.task.count({ where: { userId, completedAt: dateWhere(options.from, options.to) } }),
      prisma.studySession.findMany({ where: sessionWhere, select: { actualMinutes: true, subject: { select: { name: true } } }, orderBy: { actualMinutes: "desc" }, take: Math.min(options.limit * 10, 200) }),
    ]);
    const bySubject = new Map<string, number>();
    for (const row of subjectRows) if (row.subject) bySubject.set(row.subject.name, (bySubject.get(row.subject.name) ?? 0) + row.actualMinutes);
    const studyMinutes = total._sum.actualMinutes ?? 0;
    return { periodDays: options.from && options.to ? Math.max(1, Math.round((options.to.getTime() - options.from.getTime()) / (24 * 60 * 60 * 1000))) : 14, studyMinutes, sessions, averageSessionMinutes: sessions ? Math.round(studyMinutes / sessions) : 0, completedTasks, bySubject: [...bySubject.entries()].sort((a, b) => b[1] - a[1]).slice(0, options.limit).map(([subjectName, minutes]) => ({ subjectName, minutes })) };
  },
  async gamification(userId, options) {
    const now = options.to ?? new Date();
    const from = options.from ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [user, missions, sessions] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true, coins: true } }),
      prisma.mission.findMany({ where: { userId, date: { gte: from, lte: now } }, select: { title: true, progress: true, target: true, isComplete: true, rewardXp: true, rewardCoins: true }, orderBy: { date: "desc" }, take: options.limit }),
      prisma.studySession.findMany({ where: { userId }, select: { startedAt: true }, orderBy: { startedAt: "desc" }, take: 370 }),
    ]);
    const level = calculateLevel(user.xp);
    return { xp: user.xp, coins: user.coins, level: level.level, currentXp: level.currentXp, nextLevelXp: level.nextLevelXp, streak: calculateStudyStreak(sessions.map((session) => session.startedAt), now), missions };
  },
  async materials(userId, ids, options = { limit: DEFAULT_AI_CONTEXT_ITEM_LIMIT }) {
    return prisma.material.findMany({ where: { userId, ...idWhere(ids), ...subjectWhere(options), name: textFilter(options.query) }, select: { id: true, name: true, mimeType: true, size: true, storageKey: true }, orderBy: { uploadedAt: "desc" }, take: options.limit });
  },
};

function scopedSubjectIds(selection: ContextSelection, scopeSubjectIds: string[], requested?: string) {
  const allowed = [...new Set([...selection.subjectIds, ...scopeSubjectIds])];
  if (requested && allowed.length && !allowed.includes(requested)) return ["__no_subject_access__"];
  if (requested) return [requested];
  return allowed;
}

function toolLimit(limit: number, maxItemsPerCategory: number) {
  return Math.min(limit, maxItemsPerCategory);
}

export function scopedReadOnlyToolRepository(selection: ContextSelection, permissions: AIAcademicPermissions = defaultAIAcademicPermissions, maxItemsPerCategory = DEFAULT_AI_CONTEXT_ITEM_LIMIT, scopeSubjectIds: string[] = []): ReadOnlyToolRepository {
  const subjects = (userId: string, args: { query?: string; limit: number }) => prisma.subject.findMany({ where: { userId, ...(selection.subjectIds.length ? { id: { in: selection.subjectIds } } : scopeSubjectIds.length ? { id: { in: scopeSubjectIds } } : {}), name: textFilter(args.query) }, select: { id: true, name: true, color: true }, orderBy: { name: "asc" }, take: toolLimit(args.limit, maxItemsPerCategory) });
  return {
    subjects,
    topics: (userId, args) => prisma.topic.findMany({ where: { userId, ...(selection.topicIds.length ? { id: { in: selection.topicIds } } : {}), ...(scopedSubjectIds(selection, scopeSubjectIds).length ? { subjectId: { in: scopedSubjectIds(selection, scopeSubjectIds) } } : {}), name: textFilter(args.query) }, select: { id: true, name: true, subject: { select: { name: true } } }, orderBy: { name: "asc" }, take: toolLimit(args.limit, maxItemsPerCategory) }),
    tasks: (userId, args) => permissions.canReadTasksAndBosses ? prisma.task.findMany({ where: { userId, ...(selection.taskIds.length ? { id: { in: selection.taskIds } } : {}), ...(scopedSubjectIds(selection, scopeSubjectIds, args.subjectId).length ? { subjectId: { in: scopedSubjectIds(selection, scopeSubjectIds, args.subjectId) } } : {}), title: textFilter(args.query) }, select: { id: true, title: true, status: true, priority: true, difficulty: true, dueDate: true, estimatedMinutes: true, subject: { select: { name: true } } }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take: toolLimit(args.limit, maxItemsPerCategory) }) : Promise.resolve([]),
    bosses: (userId, args) => permissions.canReadTasksAndBosses ? prisma.boss.findMany({ where: { userId, ...(selection.bossIds.length ? { id: { in: selection.bossIds } } : {}), ...(scopedSubjectIds(selection, scopeSubjectIds, args.subjectId).length ? { subjectId: { in: scopedSubjectIds(selection, scopeSubjectIds, args.subjectId) } } : {}), title: textFilter(args.query) }, select: { id: true, title: true, date: true, topics: true, preparation: true, targetGrade: true, expectedGrade: true, actualGrade: true, subject: { select: { name: true } } }, orderBy: { date: "asc" }, take: toolLimit(args.limit, maxItemsPerCategory) }) : Promise.resolve([]),
    goals: (userId, args) => permissions.canReadTasksAndBosses ? prisma.goal.findMany({ where: { userId, ...(selection.goalIds.length ? { id: { in: selection.goalIds } } : {}), title: textFilter(args.query) }, select: { id: true, title: true, progress: true, targetDate: true, isComplete: true }, orderBy: [{ isComplete: "asc" }, { targetDate: "asc" }], take: toolLimit(args.limit, maxItemsPerCategory) }) : Promise.resolve([]),
    grades: (userId, args) => permissions.canReadGrades ? prisma.grade.findMany({ where: { userId, ...(selection.gradeIds.length ? { id: { in: selection.gradeIds } } : {}), ...(scopedSubjectIds(selection, scopeSubjectIds, args.subjectId).length ? { subjectId: { in: scopedSubjectIds(selection, scopeSubjectIds, args.subjectId) } } : {}), label: textFilter(args.query) }, select: { id: true, label: true, value: true, date: true, subject: { select: { name: true } } }, orderBy: { date: "desc" }, take: toolLimit(args.limit, maxItemsPerCategory) }) : Promise.resolve([]),
    studySessions: (userId, args) => permissions.canReadSessionsAndStatistics ? prisma.studySession.findMany({ where: { userId, ...(selection.studySessionIds.length ? { id: { in: selection.studySessionIds } } : {}), ...(scopedSubjectIds(selection, scopeSubjectIds, args.subjectId).length ? { subjectId: { in: scopedSubjectIds(selection, scopeSubjectIds, args.subjectId) } } : {}) }, select: { id: true, startedAt: true, actualMinutes: true, subject: { select: { name: true } }, task: { select: { title: true } } }, orderBy: { startedAt: "desc" }, take: toolLimit(args.limit, maxItemsPerCategory) }) : Promise.resolve([]),
    statistics: (userId, args) => permissions.canReadSessionsAndStatistics ? academicContextRepository.statistics!(userId, { limit: toolLimit(args.limit, maxItemsPerCategory), from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), to: new Date() }) : Promise.resolve({}),
    schedule: (userId, args) => permissions.canReadSchedule ? academicContextRepository.schedule!(userId, { limit: toolLimit(args.limit, maxItemsPerCategory), dayOfWeek: new Date().getDay() || 7 }) : Promise.resolve([]),
    calendar: (userId, args) => permissions.canReadSchedule && permissions.canReadTasksAndBosses ? academicContextRepository.calendar!(userId, { limit: toolLimit(args.limit, maxItemsPerCategory), from: new Date(), to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }) : Promise.resolve([]),
    materials: (userId, args) => permissions.canReadMaterials ? prisma.material.findMany({ where: { userId, ...(selection.materialIds.length ? { id: { in: selection.materialIds } } : {}), ...(scopedSubjectIds(selection, scopeSubjectIds, args.subjectId).length ? { subjectId: { in: scopedSubjectIds(selection, scopeSubjectIds, args.subjectId) } } : {}), name: textFilter(args.query) }, select: { id: true, name: true, mimeType: true, size: true, subject: { select: { name: true } } }, orderBy: { uploadedAt: "desc" }, take: toolLimit(args.limit, maxItemsPerCategory) }) : Promise.resolve([]),
    gamification: (userId, args) => permissions.canReadGamification ? academicContextRepository.gamification!(userId, { limit: toolLimit(args.limit, maxItemsPerCategory), from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to: new Date() }) : Promise.resolve({}),
  };
}

export const emptyReadOnlyToolRepository: ReadOnlyToolRepository = {
  subjects: async () => [],
  topics: async () => [],
  tasks: async () => [],
  bosses: async () => [],
  goals: async () => [],
  grades: async () => [],
  studySessions: async () => [],
  statistics: async () => ({}),
  schedule: async () => [],
  calendar: async () => [],
  materials: async () => [],
  gamification: async () => ({}),
};

export async function getAISettings(userId: string) {
  const stored = await prisma.aISettings.findUnique({ where: { userId } });
  if (stored) {
    const ollamaUrl = ollamaUrlSchema.safeParse(stored.ollamaUrl).data;
    const model = aiModelSchema.safeParse(stored.model).data;
    const contextLimit = Number.isSafeInteger(stored.contextLimit) && stored.contextLimit >= 1_000 && stored.contextLimit <= 50_000 ? stored.contextLimit : DEFAULT_AI_CONTEXT_LIMIT;
    const maxItemsPerCategory = Number.isSafeInteger(stored.maxItemsPerCategory) && stored.maxItemsPerCategory >= 1 && stored.maxItemsPerCategory <= 50 ? stored.maxItemsPerCategory : DEFAULT_AI_CONTEXT_ITEM_LIMIT;
    return { ...stored, ollamaUrl: ollamaUrl ?? DEFAULT_OLLAMA_URL, model: model ?? DEFAULT_AI_MODEL, contextLimit, maxItemsPerCategory };
  }
  return {
    userId,
    provider: "OLLAMA" as const,
    ollamaUrl: DEFAULT_OLLAMA_URL,
    model: DEFAULT_AI_MODEL,
    isAIEnabled: true,
    isAcademicContextEnabled: true,
    ...defaultAIAcademicPermissions,
    contextLimit: DEFAULT_AI_CONTEXT_LIMIT,
    maxItemsPerCategory: DEFAULT_AI_CONTEXT_ITEM_LIMIT,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

export async function getAIContextOptions(userId: string, settings?: Awaited<ReturnType<typeof getAISettings>>) {
  const effectiveSettings = settings ?? await getAISettings(userId);
  if (!effectiveSettings.isAIEnabled || !effectiveSettings.isAcademicContextEnabled) return { subjects: [], topics: [], tasks: [], bosses: [], grades: [], goals: [], studySessions: [], materials: [] };
  const [subjects, topics, tasks, bosses, grades, goals, studySessions, materials] = await Promise.all([
    prisma.subject.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 100 }),
    prisma.topic.findMany({ where: { userId }, select: { id: true, name: true, subject: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    effectiveSettings.canReadTasksAndBosses ? prisma.task.findMany({ where: { userId }, select: { id: true, title: true, subject: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 100 }) : Promise.resolve([]),
    effectiveSettings.canReadTasksAndBosses ? prisma.boss.findMany({ where: { userId }, select: { id: true, title: true, subject: { select: { name: true } } }, orderBy: { date: "asc" }, take: 100 }) : Promise.resolve([]),
    effectiveSettings.canReadGrades ? prisma.grade.findMany({ where: { userId }, select: { id: true, label: true, value: true, subject: { select: { name: true } } }, orderBy: { date: "desc" }, take: 100 }) : Promise.resolve([]),
    effectiveSettings.canReadTasksAndBosses ? prisma.goal.findMany({ where: { userId }, select: { id: true, title: true, progress: true }, orderBy: { updatedAt: "desc" }, take: 100 }) : Promise.resolve([]),
    effectiveSettings.canReadSessionsAndStatistics ? prisma.studySession.findMany({ where: { userId }, select: { id: true, actualMinutes: true, startedAt: true, subject: { select: { name: true } }, task: { select: { title: true } } }, orderBy: { startedAt: "desc" }, take: 100 }) : Promise.resolve([]),
    effectiveSettings.canReadMaterials ? prisma.material.findMany({ where: { userId }, select: { id: true, name: true, mimeType: true, subject: { select: { name: true } } }, orderBy: { uploadedAt: "desc" }, take: 100 }) : Promise.resolve([]),
  ]);
  return {
    subjects: subjects.map((item) => ({ id: item.id, label: item.name })),
    topics: topics.map((item) => ({ id: item.id, label: `${item.subject.name} · ${item.name}` })),
    tasks: tasks.map((item) => ({ id: item.id, label: item.subject ? `${item.title} · ${item.subject.name}` : item.title })),
    bosses: bosses.map((item) => ({ id: item.id, label: `${item.title} · ${item.subject.name}` })),
    grades: grades.map((item) => ({ id: item.id, label: `${item.label} (${item.value}) · ${item.subject.name}` })),
    goals: goals.map((item) => ({ id: item.id, label: `${item.title} · ${item.progress}%` })),
    studySessions: studySessions.map((item) => ({ id: item.id, label: `${item.actualMinutes} min · ${item.subject?.name ?? item.task?.title ?? item.startedAt.toLocaleDateString("es-ES")}` })),
    materials: materials.map((item) => ({ id: item.id, label: item.subject ? `${item.name} · ${item.subject.name}` : item.name, mimeType: item.mimeType })),
  };
}
