import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUserId } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addCalendarDays, calendarDateKeys, effectiveClassesForDate, normalizeCalendarView, shiftCalendarMonth, type CalendarView, type EffectiveClass } from "@/lib/domain/calendar";
import { dateOnlyInputValue, zonedCalendarStart, zonedDateKey, zonedDayRange, zonedMonthRange, zonedWeekRange, normalizeTimeZone } from "@/lib/domain/dates";
import { prisma } from "@/lib/prisma";

const weekdays = ["L", "M", "X", "J", "V", "S", "D"];

function isDateKey(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T12:00:00.000Z`).getTime());
}

function dateAtStart(key: string, timeZone: string) {
  const [year, month, day] = key.split("-").map(Number);
  return zonedCalendarStart({ year, month, day, hour: 0, minute: 0, second: 0 }, timeZone);
}

function daysInMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function viewLabel(view: CalendarView) {
  return view === "day" ? "Día" : view === "week" ? "Semana" : "Mes";
}

type CalendarTask = { id: string; title: string; dueDate: Date | null; planningMode: "FIXED_DEADLINE" | "FLEXIBLE_STUDY"; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" };
type CalendarBoss = { id: string; title: string; date: Date };
type CalendarGoal = { id: string; title: string; targetDate: Date | null };

function CalendarDayContents({ dayKey, compact = false, timeZone, classes, tasks, bosses, goals }: { dayKey: string; compact?: boolean; timeZone: string; classes: EffectiveClass[]; tasks: CalendarTask[]; bosses: CalendarBoss[]; goals: CalendarGoal[] }) {
  const dayTasks = tasks.filter((task) => task.dueDate && zonedDateKey(task.dueDate, timeZone) === dayKey);
  const dayBosses = bosses.filter((boss) => zonedDateKey(boss.date, timeZone) === dayKey);
  const dayGoals = goals.filter((goal) => goal.targetDate && dateOnlyInputValue(goal.targetDate) === dayKey);
  return <div className={compact ? "space-y-1" : "space-y-3"}>
    {classes.length > 0 && <div className="space-y-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Clases</p>{classes.map((item) => <p key={item.id} className="truncate rounded bg-primary/10 px-2 py-1 text-xs"><span className="font-semibold">{item.startTime}–{item.endTime}</span> · {item.subjectName}{item.room ? ` · ${item.room}` : ""}{item.isChange ? " · cambio" : ""}</p>)}</div>}
    {dayTasks.length > 0 && <div className="space-y-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tareas</p>{dayTasks.map((task) => <Link href="/app/tasks" key={task.id} className={`block truncate rounded bg-muted px-2 py-1 text-xs hover:bg-primary/10 ${task.status === "COMPLETED" ? "line-through opacity-60" : ""}`}>{task.planningMode === "FIXED_DEADLINE" ? "Entrega" : "Estudio"} · {task.title}</Link>)}</div>}
    {dayBosses.length > 0 && <div className="space-y-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bosses</p>{dayBosses.map((boss) => <Link href="/app/bosses" key={boss.id} className="block truncate rounded bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/15">{boss.title}</Link>)}</div>}
    {dayGoals.length > 0 && <div className="space-y-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Objetivos</p>{dayGoals.map((goal) => <Link href="/app/goals" key={goal.id} className="block truncate rounded bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/15">{goal.title}</Link>)}</div>}
    {!classes.length && !dayTasks.length && !dayBosses.length && !dayGoals.length && <p className="text-xs text-muted-foreground">Nada programado.</p>}
  </div>;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string; month?: string }> }) {
  const userId = await requireUserId();
  const params = await searchParams;
  const view = normalizeCalendarView(params.view);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } });
  const timeZone = normalizeTimeZone(user.timezone);
  const todayKey = zonedDateKey(new Date(), timeZone);
  const fallbackKey = params.month && /^\d{4}-\d{2}$/.test(params.month) ? `${params.month}-01` : todayKey;
  const dateKey = isDateKey(params.date) ? params.date : fallbackKey;
  const selectedDate = dateAtStart(dateKey, timeZone);
  const range = view === "day" ? zonedDayRange(selectedDate, timeZone) : view === "week" ? zonedWeekRange(selectedDate, timeZone) : zonedMonthRange(selectedDate, timeZone);
  const rangeStartKey = zonedDateKey(range.start, timeZone);
  const rangeEndKey = zonedDateKey(new Date(range.end.getTime() - 1_000), timeZone);
  const rangeKeys = calendarDateKeys(rangeStartKey, addCalendarDays(rangeEndKey, 1));
  const databaseDateStart = new Date(`${rangeKeys[0]}T00:00:00.000Z`);
  const databaseDateEnd = new Date(`${addCalendarDays(rangeKeys[rangeKeys.length - 1], 1)}T00:00:00.000Z`);
  const [tasks, bosses, goals, entries, changes] = await Promise.all([
    prisma.task.findMany({ where: { userId, dueDate: { gte: range.start, lt: range.end } }, select: { id: true, title: true, dueDate: true, planningMode: true, status: true } }),
    prisma.boss.findMany({ where: { userId, date: { gte: range.start, lt: range.end } }, select: { id: true, title: true, date: true } }),
    prisma.goal.findMany({ where: { userId, targetDate: { gte: databaseDateStart, lt: databaseDateEnd } }, select: { id: true, title: true, targetDate: true } }),
    prisma.timetableEntry.findMany({ where: { userId }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }], include: { subject: { select: { name: true } } } }),
    prisma.timetableChange.findMany({ where: { userId, date: { gte: databaseDateStart, lt: databaseDateEnd } }, orderBy: { startTime: "asc" }, include: { subject: { select: { name: true } } } }),
  ]);
  const recurring = entries.map((entry) => ({ id: entry.id, dayOfWeek: entry.dayOfWeek, startTime: entry.startTime, endTime: entry.endTime, room: entry.room, subjectName: entry.subject.name }));
  const overrides = changes.map((change) => ({ id: change.id, baseEntryId: change.baseEntryId, date: change.date, startTime: change.startTime, endTime: change.endTime, room: change.room, subjectName: change.subject.name, isCancelled: change.isCancelled }));
  const classesFor = (key: string) => effectiveClassesForDate(key, recurring, overrides);
  const dateLabel = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", { ...options, timeZone }).format(dateAtStart(key, timeZone));
  const navigationKey = (amount: number) => view === "month" ? shiftCalendarMonth(dateKey, amount) : addCalendarDays(dateKey, amount);
  const navigationHref = (key: string) => `/app/calendar?view=${view}&date=${key}`;
  const monthKey = `${dateKey.slice(0, 7)}-01`;
  const monthOffset = (new Date(`${monthKey}T12:00:00.000Z`).getUTCDay() + 6) % 7;
  const monthTotalDays = daysInMonth(monthKey);
  const monthGridStart = addCalendarDays(monthKey, -monthOffset);
  const monthGridEnd = addCalendarDays(monthKey, monthTotalDays - 1 + (7 - ((monthOffset + monthTotalDays) % 7)) % 7);
  const monthGridKeys = calendarDateKeys(monthGridStart, addCalendarDays(monthGridEnd, 1));

  return <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
    <PageHeader eyebrow={`Vista ${viewLabel(view).toLowerCase()}`} title={view === "month" ? dateLabel(monthKey, { month: "long", year: "numeric" }) : view === "week" ? `Semana del ${dateLabel(rangeStartKey, { day: "numeric", month: "short" })}` : dateLabel(dateKey, { weekday: "long", day: "numeric", month: "long" })} description={`Clases, tareas, Bosses y objetivos en tu zona horaria: ${timeZone}.`} actions={<div className="flex items-center"><Button asChild variant="outline" size="icon"><Link aria-label="Periodo anterior" href={navigationHref(navigationKey(view === "week" ? -7 : -1))}><ChevronLeft className="size-4" /></Link></Button><Button asChild variant="outline" size="icon" className="-ml-px"><Link aria-label="Periodo siguiente" href={navigationHref(navigationKey(view === "week" ? 7 : 1))}><ChevronRight className="size-4" /></Link></Button></div>} />
    <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-lg border bg-card p-1">{(["day", "week", "month"] as CalendarView[]).map((item) => <Button key={item} asChild size="sm" variant={item === view ? "default" : "ghost"}><Link href={`/app/calendar?view=${item}&date=${dateKey}`}>{viewLabel(item)}</Link></Button>)}</div><Button asChild size="sm" variant="outline"><Link href={`/app/calendar?view=${view}&date=${todayKey}`}>Hoy</Link></Button><Badge>Zona horaria: {timeZone}</Badge></div>
    {view === "day" && <Card><CardHeader><CardTitle>{dateLabel(dateKey, { weekday: "long", day: "numeric", month: "long" })}</CardTitle></CardHeader><CardContent><CalendarDayContents dayKey={dateKey} timeZone={timeZone} classes={classesFor(dateKey)} tasks={tasks} bosses={bosses} goals={goals} /></CardContent></Card>}
    {view === "week" && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">{rangeKeys.map((key) => <Card key={key} className={key === todayKey ? "border-primary" : ""}><CardHeader className="p-4 pb-2"><CardTitle className="capitalize text-sm">{dateLabel(key, { weekday: "short" })}<span className="ml-1 text-muted-foreground">{dateLabel(key, { day: "numeric", month: "short" })}</span></CardTitle></CardHeader><CardContent className="p-4 pt-2"><CalendarDayContents dayKey={key} compact timeZone={timeZone} classes={classesFor(key)} tasks={tasks} bosses={bosses} goals={goals} /></CardContent></Card>)}</div>}
    {view === "month" && <div className="overflow-x-auto rounded-xl border bg-card"><div className="min-w-[760px]"><div className="grid grid-cols-7 border-b">{weekdays.map((day) => <div key={day} className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{day}</div>)}</div><div className="grid grid-cols-7">{monthGridKeys.map((key) => <div key={key} className={`min-h-32 border-b border-r p-2 ${!key.startsWith(monthKey.slice(0, 7)) ? "bg-muted/20" : ""} ${key === todayKey ? "ring-2 ring-inset ring-primary/50" : ""}`}><span className={`text-xs font-medium ${!key.startsWith(monthKey.slice(0, 7)) ? "text-muted-foreground/40" : ""}`}>{dateLabel(key, { day: "numeric" })}</span><div className="mt-2"><CalendarDayContents dayKey={key} compact timeZone={timeZone} classes={classesFor(key)} tasks={tasks} bosses={bosses} goals={goals} /></div></div>)}</div></div></div>}
    <div className="flex flex-wrap gap-2"><Badge>Clase</Badge><Badge>Entrega / estudio</Badge><Badge className="bg-destructive/10 text-destructive">Boss</Badge><Badge className="bg-primary/10 text-primary">Objetivo</Badge></div>
  </div>;
}
