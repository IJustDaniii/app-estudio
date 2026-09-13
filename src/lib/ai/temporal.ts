import { normalizeTimeZone, zonedDayRange, zonedDayStart, zonedMonthRange, zonedWeekRange } from "@/lib/domain/dates";

export type AcademicTimeRangeKind = "today" | "tomorrow" | "week" | "month" | "upcoming" | "recent";
export type AcademicTimeRange = { kind: AcademicTimeRangeKind; start: Date; end: Date; explicit: boolean };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function academicTimeRangeForKind(kind: AcademicTimeRangeKind, now = new Date(), timeZone?: string): AcademicTimeRange {
  const zone = normalizeTimeZone(timeZone);
  if (kind === "month") return { kind, ...zonedMonthRange(now, zone), explicit: true };
  if (kind === "week") return { kind, ...zonedWeekRange(now, zone), explicit: true };
  if (kind === "tomorrow") return { kind, ...zonedDayRange(now, zone, -1, 1), explicit: true };
  if (kind === "today") return { kind, ...zonedDayRange(now, zone), explicit: true };
  if (kind === "upcoming") return { kind, start: now, end: zonedDayStart(now, zone, 30), explicit: true };
  return { kind, start: zonedDayStart(now, zone, -14), end: now, explicit: true };
}

export function resolveAcademicTimeRange(message: string, now = new Date(), timeZone?: string): AcademicTimeRange {
  const text = normalize(message);
  if (/\b(este mes|mes actual|mensual|mensuales)\b/.test(text)) return academicTimeRangeForKind("month", now, timeZone);
  if (/\b(esta semana|horario semanal|semana actual|semanal)\b/.test(text)) return academicTimeRangeForKind("week", now, timeZone);
  if (/\b(manana|proximo dia)\b/.test(text)) return academicTimeRangeForKind("tomorrow", now, timeZone);
  if (/\b(hoy|ahora|esta tarde|esta noche)\b/.test(text)) return academicTimeRangeForKind("today", now, timeZone);
  if (/\b(proximo|proxima|proximos|proximas|proximamente|siguiente|siguientes)\b/.test(text)) return academicTimeRangeForKind("upcoming", now, timeZone);
  if (/\b(reciente|recientes|ultimamente|ultimos|ultimas)\b/.test(text)) return academicTimeRangeForKind("recent", now, timeZone);
  return { ...academicTimeRangeForKind("recent", now, timeZone), explicit: false };
}
