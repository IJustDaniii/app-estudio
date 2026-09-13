import { normalizeTimeZone, zonedDayRange, zonedDayStart, zonedMonthRange, zonedWeekRange } from "@/lib/domain/dates";

export type AcademicTimeRangeKind = "today" | "tomorrow" | "week" | "month" | "upcoming" | "recent";
export type AcademicTimeRange = { kind: AcademicTimeRangeKind; start: Date; end: Date };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function resolveAcademicTimeRange(message: string, now = new Date(), timeZone?: string): AcademicTimeRange {
  const zone = normalizeTimeZone(timeZone);
  const text = normalize(message);
  if (/\b(este mes|mes actual)\b/.test(text)) return { kind: "month", ...zonedMonthRange(now, zone) };
  if (/\b(esta semana|horario semanal|semana actual)\b/.test(text)) return { kind: "week", ...zonedWeekRange(now, zone) };
  if (/\b(manana|proximo dia)\b/.test(text)) return { kind: "tomorrow", ...zonedDayRange(now, zone, -1, 1) };
  if (/\b(hoy|ahora|esta tarde|esta noche)\b/.test(text)) return { kind: "today", ...zonedDayRange(now, zone) };
  if (/\b(proximo|proximos|siguiente|siguientes)\b/.test(text)) return { kind: "upcoming", start: now, end: zonedDayStart(now, zone, 30) };
  return { kind: "recent", start: zonedDayStart(now, zone, -14), end: now };
}
