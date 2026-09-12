import { describe, expect, it } from "vitest";
import { dateOnlyForLocalDay, localDayBounds } from "@/lib/domain/dates";

describe("límites diarios", () => {
  it("crea un intervalo local de exactamente un día", () => {
    const { start, end } = localDayBounds(new Date(2026, 8, 12, 14, 30));
    expect(start.getHours()).toBe(0);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("representa la fecha local sin desplazar el día por zona horaria", () => {
    expect(dateOnlyForLocalDay(new Date(2026, 8, 12, 23, 0)).toISOString()).toBe("2026-09-12T00:00:00.000Z");
  });
});
