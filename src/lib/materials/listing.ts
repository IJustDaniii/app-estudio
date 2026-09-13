import type { Prisma } from "@prisma/client";
import { MATERIAL_PAGE_SIZE, type MaterialTypeValue } from "@/lib/materials/constants";

export type MaterialListSort = "date" | "name" | "size";

export type MaterialListInput = {
  userId: string;
  subjectId?: string;
  topicId?: string;
  taskId?: string;
  bossId?: string;
  filterSubjectId?: string;
  query?: string;
  type?: MaterialTypeValue;
  favorites?: boolean;
  sort: MaterialListSort;
  page: number;
};

export function materialListArgs(input: MaterialListInput) {
  const and: Prisma.MaterialWhereInput[] = [];
  if (input.topicId) and.push({ topicId: input.topicId });
  if (input.taskId) and.push({ taskId: input.taskId });
  else if (input.bossId) and.push({ bossId: input.bossId });
  else if (input.subjectId) and.push({ subjectId: input.subjectId });
  if (input.filterSubjectId) and.push({ subjectId: input.filterSubjectId });
  if (input.query) and.push({ name: { contains: input.query, mode: "insensitive" } });
  if (input.type) and.push({ type: input.type });
  if (input.favorites) and.push({ isFavorite: true });

  const orderBy: Prisma.MaterialOrderByWithRelationInput[] = input.sort === "name"
    ? [{ name: "asc" }, { id: "asc" }]
    : input.sort === "size"
      ? [{ size: "desc" }, { id: "desc" }]
      : [{ uploadedAt: "desc" }, { id: "desc" }];

  return {
    where: { userId: input.userId, ...(and.length ? { AND: and } : {}) },
    orderBy,
    skip: (input.page - 1) * MATERIAL_PAGE_SIZE,
    take: MATERIAL_PAGE_SIZE + 1,
  } satisfies Prisma.MaterialFindManyArgs;
}
