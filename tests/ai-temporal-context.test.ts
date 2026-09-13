import { describe, expect, it } from "vitest";
import { resolveAcademicTimeRange } from "@/lib/ai/temporal";

describe("rango temporal académico común", () => {
  const now = new Date("2026-09-13T01:00:00.000Z");

  it.each([
    ["¿Qué tengo mañana?", "tomorrow", "2026-09-13T22:00:00.000Z", "2026-09-14T22:00:00.000Z"],
    ["Organízame el estudio esta semana", "week", "2026-09-06T22:00:00.000Z", "2026-09-13T22:00:00.000Z"],
    ["¿Cuál es mi horario semanal?", "week", "2026-09-06T22:00:00.000Z", "2026-09-13T22:00:00.000Z"],
    ["¿Cómo voy este mes?", "month", "2026-08-31T22:00:00.000Z", "2026-09-30T22:00:00.000Z"],
  ] as const)("reconoce %s", (message, kind, start, end) => {
    const range = resolveAcademicTimeRange(message, now, "Europe/Madrid");
    expect(range).toMatchObject({ kind, start: new Date(start), end: new Date(end) });
  });

  it("usa próximos eventos excluyendo lo ya pasado", () => {
    const range = resolveAcademicTimeRange("¿Cuál es mi próximo examen?", now, "Europe/Madrid");
    expect(range.kind).toBe("upcoming");
    expect(range.start).toEqual(now);
    expect(range.end.getTime()).toBeGreaterThan(now.getTime());
  });

  it("reconoce próximamente, recientes y notas mensuales", () => {
    expect(resolveAcademicTimeRange("¿Qué puedo hacer próximamente?", now, "Europe/Madrid").kind).toBe("upcoming");
    expect(resolveAcademicTimeRange("Enséñame mis datos recientes", now, "Europe/Madrid").kind).toBe("recent");
    expect(resolveAcademicTimeRange("¿Cómo van mis notas mensuales?", now, "Europe/Madrid").kind).toBe("month");
  });

  it("no marca como temporal una búsqueda textual normal", () => {
    const range = resolveAcademicTimeRange("matemáticas", now, "Europe/Madrid");
    expect(range.explicit).toBe(false);
  });
});
