import { describe, expect, it } from "vitest";
import { dateOnlyForLocalDay, dateOnlyInputValue, formatDateForTimeZone, localDateInputValue, localDateTimeInputValue, localDayBounds, parseDateOnly, parseLocalDate, parseLocalDateTime, zonedDateKey, zonedDayOfWeek, zonedDayRange } from "@/lib/domain/dates";
import { calculateStudyStreak } from "@/lib/domain/progress";

describe("límites diarios", () => {
  it("crea un intervalo local de exactamente un día", () => {
    const { start, end } = localDayBounds(new Date(2026, 8, 12, 14, 30));
    expect(start.getHours()).toBe(0);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("representa la fecha local sin desplazar el día por zona horaria", () => {
    expect(dateOnlyForLocalDay(new Date(2026, 8, 12, 23, 0)).toISOString()).toBe("2026-09-12T00:00:00.000Z");
  });

  it("calcula el día del usuario y respeta cambios de horario de verano", () => {
    const now = new Date("2026-03-29T12:00:00.000Z");
    const { start, end } = zonedDayRange(now, "Europe/Madrid");
    expect(zonedDateKey(now, "Europe/Madrid")).toBe("2026-03-29");
    expect(zonedDayOfWeek(now, "Europe/Madrid")).toBe(7);
    expect(start.toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect(formatDateForTimeZone(new Date("2026-03-29T22:00:00.000Z"), "Europe/Madrid")).toContain("2026-03-30 00:00");
  });

  it("calcula la racha usando el día local del usuario", () => {
    expect(calculateStudyStreak([new Date("2026-09-12T23:30:00.000Z")], new Date("2026-09-13T00:30:00.000Z"), "Europe/Madrid")).toBe(1);
  });
  it("convierte correctamente una hora cercana a medianoche en Madrid y Nueva York", () => {
    const instant = new Date("2026-09-14T00:30:00.000Z");

    expect(zonedDateKey(instant, "Europe/Madrid")).toBe("2026-09-14");
    expect(zonedDateKey(instant, "America/New_York")).toBe("2026-09-13");
    expect(localDateTimeInputValue(instant, "Europe/Madrid")).toBe("2026-09-14T02:30");
    expect(localDateTimeInputValue(instant, "America/New_York")).toBe("2026-09-13T20:30");
    expect(parseLocalDateTime("2026-09-14T02:30", "Europe/Madrid").toISOString()).toBe(instant.toISOString());
    expect(parseLocalDateTime("2026-09-13T20:30", "America/New_York").toISOString()).toBe(instant.toISOString());
  });

  it("mantiene el día elegido para objetivos, notas y cambios de horario", () => {
    const instant = new Date("2026-09-14T00:30:00.000Z");

    expect(localDateInputValue(instant, "America/New_York")).toBe("2026-09-13");
    expect(parseLocalDate("2026-09-13", "America/New_York").toISOString()).toBe("2026-09-13T04:00:00.000Z");
    expect(dateOnlyInputValue(parseDateOnly("2026-09-13"))).toBe("2026-09-13");
    expect(parseDateOnly("2026-09-13").toISOString()).toBe("2026-09-13T00:00:00.000Z");
  });
});
