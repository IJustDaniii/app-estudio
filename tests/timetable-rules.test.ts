import { describe, expect, it, vi } from "vitest";
import { ensureTimetableEntrySubjectChangeAllowed, timetableSubjectChangeMessage } from "@/lib/domain/timetable-rules";

describe("protección de cambios de asignatura en clases habituales", () => {
  it("bloquea el cambio si hay cambios puntuales de la misma cuenta", async () => {
    const count = vi.fn().mockResolvedValue(1);
    const database = { timetableChange: { count } };

    await expect(
      ensureTimetableEntrySubjectChangeAllowed(database as never, "user-a", "entry-1", "subject-a", "subject-b"),
    ).rejects.toThrow("TIMETABLE_ENTRY_SUBJECT_CHANGE_BLOCKED");
    expect(count).toHaveBeenCalledWith({ where: { userId: "user-a", baseEntryId: "entry-1" } });
    expect(timetableSubjectChangeMessage).toContain("cambios puntuales");
  });

  it("permite el cambio cuando no hay cambios puntuales", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const database = { timetableChange: { count } };

    await expect(
      ensureTimetableEntrySubjectChangeAllowed(database as never, "user-a", "entry-1", "subject-a", "subject-b"),
    ).resolves.toBeUndefined();
  });

  it("no consulta cambios si la asignatura no cambia", async () => {
    const count = vi.fn();
    const database = { timetableChange: { count } };

    await expect(
      ensureTimetableEntrySubjectChangeAllowed(database as never, "user-a", "entry-1", "subject-a", "subject-a"),
    ).resolves.toBeUndefined();
    expect(count).not.toHaveBeenCalled();
  });
});
