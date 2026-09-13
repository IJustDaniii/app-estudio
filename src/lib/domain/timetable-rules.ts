import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Database = typeof prisma | Prisma.TransactionClient;

export const timetableSubjectChangeMessage = "No se puede cambiar de asignatura una clase habitual que tiene cambios puntuales. Primero elimina esos cambios o edítalos para que pertenezcan a la nueva asignatura.";

export async function ensureTimetableEntrySubjectChangeAllowed(
  database: Database,
  userId: string,
  entryId: string,
  currentSubjectId: string,
  nextSubjectId: string,
) {
  if (currentSubjectId === nextSubjectId) return;
  const changes = await database.timetableChange.count({ where: { userId, baseEntryId: entryId } });
  if (changes > 0) throw new Error("TIMETABLE_ENTRY_SUBJECT_CHANGE_BLOCKED");
}
