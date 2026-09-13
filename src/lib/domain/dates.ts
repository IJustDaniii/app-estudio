export function localDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function dateOnlyForLocalDay(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export const DEFAULT_TIME_ZONE = "Europe/Madrid";

export const SUPPORTED_TIME_ZONES = ["Europe/Madrid", "Atlantic/Canary", "Europe/London", "Europe/Paris", "America/New_York", "America/Mexico_City", "America/Argentina/Buenos_Aires", "UTC", "Asia/Tokyo"] as const;
export const TIME_ZONE_OPTIONS = [
  { value: "Europe/Madrid", label: "Madrid (España)" },
  { value: "Atlantic/Canary", label: "Canarias (España)" },
  { value: "Europe/London", label: "Londres (Reino Unido)" },
  { value: "Europe/Paris", label: "París (Francia)" },
  { value: "America/New_York", label: "Nueva York (EE. UU.)" },
  { value: "America/Mexico_City", label: "Ciudad de México" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (Argentina)" },
  { value: "UTC", label: "UTC" },
  { value: "Asia/Tokyo", label: "Tokio (Japón)" },
] as const;

export function normalizeTimeZone(timeZone?: string) {
  if (!timeZone) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

type CalendarParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function calendarParts(date: Date, timeZone: string): CalendarParts {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeTimeZone(timeZone), calendar: "gregory", numberingSystem: "latn",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(values.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

export function zonedCalendarStart(parts: CalendarParts, timeZone = DEFAULT_TIME_ZONE) {
  const wallTime = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let candidate = wallTime;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = calendarParts(new Date(candidate), timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    candidate += wallTime - actualAsUtc;
  }
  return new Date(candidate);
}

export function zonedDateKey(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = calendarParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function zonedDayOfWeek(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: normalizeTimeZone(timeZone), weekday: "short" }).format(date);
  return ({ Sun: 7, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[weekday] ?? 1;
}

export function zonedDayStart(date: Date, timeZone = DEFAULT_TIME_ZONE, dayOffset = 0) {
  const parts = calendarParts(date, timeZone);
  const wallDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset));
  return zonedCalendarStart({ year: wallDate.getUTCFullYear(), month: wallDate.getUTCMonth() + 1, day: wallDate.getUTCDate(), hour: 0, minute: 0, second: 0 }, timeZone);
}

export function zonedDayRange(date: Date, timeZone = DEFAULT_TIME_ZONE, daysBefore = 0, daysAfter = 0) {
  const start = zonedDayStart(date, timeZone, -daysBefore);
  const end = zonedDayStart(date, timeZone, daysAfter + 1);
  return { start, end };
}

export function zonedWeekRange(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const day = zonedDayOfWeek(date, timeZone);
  const start = zonedDayStart(date, timeZone, 1 - day);
  const end = zonedDayStart(date, timeZone, 8 - day);
  return { start, end };
}

export function zonedMonthRange(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const [year, month] = zonedDateKey(date, timeZone).split("-").map(Number);
  const start = zonedCalendarStart({ year, month, day: 1, hour: 0, minute: 0, second: 0 }, timeZone);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const end = zonedCalendarStart({ ...next, day: 1, hour: 0, minute: 0, second: 0 }, timeZone);
  return { start, end };
}

export function formatDateForTimeZone(date: Date | null | undefined, timeZone = DEFAULT_TIME_ZONE) {
  if (!date) return null;
  const safeTimeZone = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone, calendar: "gregory", numberingSystem: "latn",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")} (${safeTimeZone})`;
}

function assertValidCalendarParts(parts: CalendarParts) {
  const candidate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
  if (candidate.getUTCFullYear() !== parts.year || candidate.getUTCMonth() + 1 !== parts.month || candidate.getUTCDate() !== parts.day || candidate.getUTCHours() !== parts.hour || candidate.getUTCMinutes() !== parts.minute || candidate.getUTCSeconds() !== parts.second) {
    throw new Error("INVALID_LOCAL_DATE");
  }
}

function parseCalendarInput(value: string, withTime: boolean): CalendarParts {
  const match = withTime
    ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
    : /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("INVALID_LOCAL_DATE");
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4] ?? 0), minute: Number(match[5] ?? 0), second: Number(match[6] ?? 0) };
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31 || parts.hour > 23 || parts.minute > 59 || parts.second > 59) throw new Error("INVALID_LOCAL_DATE");
  assertValidCalendarParts(parts);
  return parts;
}

export function localDateTimeInputValue(date: Date | null | undefined, timeZone = DEFAULT_TIME_ZONE) {
  if (!date) return "";
  const parts = calendarParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function localDateInputValue(date: Date | null | undefined, timeZone = DEFAULT_TIME_ZONE) {
  if (!date) return "";
  const parts = calendarParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function dateOnlyInputValue(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function parseLocalDateTime(value: string, timeZone = DEFAULT_TIME_ZONE) {
  return zonedCalendarStart(parseCalendarInput(value, true), normalizeTimeZone(timeZone));
}

export function parseLocalDate(value: string, timeZone = DEFAULT_TIME_ZONE) {
  return zonedCalendarStart(parseCalendarInput(value, false), normalizeTimeZone(timeZone));
}

export function parseDateOnly(value: string) {
  const parts = parseCalendarInput(value, false);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}
