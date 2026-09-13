import { describe, expect, it } from "vitest";
import { addCalendarDays, calendarDateKeys, effectiveClassesForDate, normalizeCalendarView, shiftCalendarMonth } from "@/lib/domain/calendar";

describe("reglas del calendario", () => {
  it("acepta las tres vistas y vuelve al mes si llega un valor desconocido", () => {
    expect(normalizeCalendarView("day")).toBe("day");
    expect(normalizeCalendarView("week")).toBe("week");
    expect(normalizeCalendarView("month")).toBe("month");
    expect(normalizeCalendarView("agenda")).toBe("month");
  });

  it("calcula claves consecutivas sin depender de la zona horaria del servidor", () => {
    expect(addCalendarDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(shiftCalendarMonth("2026-01-31", -1)).toBe("2025-12-01");
    expect(calendarDateKeys("2026-09-28", "2026-10-02")).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"]);
  });

  it("sustituye una clase habitual, respeta una cancelación y conserva cambios independientes", () => {
    const classes = effectiveClassesForDate("2026-09-14", [
      { id: "entry-1", dayOfWeek: 1, startTime: "09:00", endTime: "10:00", room: "Aula 1", subjectName: "Historia" },
      { id: "entry-2", dayOfWeek: 1, startTime: "11:00", endTime: "12:00", room: null, subjectName: "Lengua" },
    ], [
      { id: "change-1", baseEntryId: "entry-1", date: new Date("2026-09-14T00:00:00.000Z"), startTime: "10:00", endTime: "11:00", room: "Aula 3", subjectName: "Historia", isCancelled: false },
      { id: "change-2", baseEntryId: "entry-2", date: new Date("2026-09-14T00:00:00.000Z"), startTime: "11:00", endTime: "12:00", room: null, subjectName: "Lengua", isCancelled: true },
      { id: "change-3", baseEntryId: null, date: new Date("2026-09-14T00:00:00.000Z"), startTime: "13:00", endTime: "14:00", room: "Aula 4", subjectName: "Música", isCancelled: false },
    ]);
    expect(classes).toHaveLength(2);
    expect(classes.map((item) => item.startTime)).toEqual(["10:00", "13:00"]);
    expect(classes[0].isChange).toBe(true);
  });
});
