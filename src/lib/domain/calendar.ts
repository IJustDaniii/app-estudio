export type CalendarView = "day" | "week" | "month";

export type RecurringClass = { id: string; dayOfWeek: number; startTime: string; endTime: string; room: string | null; subjectName: string };
export type TimetableOverride = { id: string; baseEntryId: string | null; date: Date; startTime: string; endTime: string; room: string | null; subjectName: string; isCancelled: boolean };
export type EffectiveClass = { id: string; startTime: string; endTime: string; room: string | null; subjectName: string; isChange: boolean };

export function normalizeCalendarView(value?: string): CalendarView {
  return value === "day" || value === "week" || value === "month" ? value : "month";
}

function dateFromKey(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error("INVALID_CALENDAR_DATE");
  const date = new Date(`${key}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_CALENDAR_DATE");
  return date;
}

export function addCalendarDays(key: string, amount: number) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function calendarDateKeys(startKey: string, endExclusiveKey: string) {
  const keys: string[] = [];
  for (let key = startKey; key < endExclusiveKey; key = addCalendarDays(key, 1)) keys.push(key);
  return keys;
}

export function shiftCalendarMonth(key: string, amount: number) {
  const date = dateFromKey(key);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7) + "-01";
}

function dayOfWeekForKey(key: string) {
  const day = dateFromKey(key).getUTCDay();
  return day === 0 ? 7 : day;
}

function dateKeyForStoredDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function effectiveClassesForDate(dateKey: string, recurring: RecurringClass[], overrides: TimetableOverride[]): EffectiveClass[] {
  const dayOfWeek = dayOfWeekForKey(dateKey);
  const dateOverrides = overrides.filter((override) => dateKeyForStoredDate(override.date) === dateKey);
  const replacedEntries = new Set(dateOverrides.flatMap((override) => override.baseEntryId ? [override.baseEntryId] : []));
  const classes: EffectiveClass[] = recurring
    .filter((entry) => entry.dayOfWeek === dayOfWeek && !replacedEntries.has(entry.id))
    .map((entry) => ({ ...entry, isChange: false }));
  classes.push(...dateOverrides.filter((override) => !override.isCancelled).map((override) => ({
    id: override.id, startTime: override.startTime, endTime: override.endTime, room: override.room, subjectName: override.subjectName, isChange: true,
  })));
  return classes.sort((a, b) => a.startTime.localeCompare(b.startTime) || a.subjectName.localeCompare(b.subjectName));
}
