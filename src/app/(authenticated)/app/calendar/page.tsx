import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUserId } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

const weekdays = ["L", "M", "X", "J", "V", "S", "D"];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const userId = await requireUserId();
  const raw = (await searchParams).month;
  const base = raw && /^\d{4}-\d{2}$/.test(raw) ? new Date(`${raw}-01T12:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const [tasks, bosses, goals] = await Promise.all([
    prisma.task.findMany({ where: { userId, dueDate: { gte: start, lt: end } }, select: { id: true, title: true, dueDate: true, planningMode: true } }),
    prisma.boss.findMany({ where: { userId, date: { gte: start, lt: end } }, select: { id: true, title: true, date: true } }),
    prisma.goal.findMany({ where: { userId, targetDate: { gte: start, lt: end } }, select: { id: true, title: true, targetDate: true } }),
  ]);
  const offset = (start.getDay() + 6) % 7;
  const totalDays = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + totalDays) / 7) * 7 }, (_, i) => i - offset + 1);
  const key = (date: Date | null) => date?.getDate();
  const monthParam = (delta: number) => { const value = new Date(base.getFullYear(), base.getMonth() + delta, 1); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`; };

  return <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Vista mensual" title={new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(base)} description="Fechas de tareas, Bosses y objetivos." actions={<div className="flex"><Button asChild variant="outline" size="icon"><Link aria-label="Mes anterior" href={`/app/calendar?month=${monthParam(-1)}`}><ChevronLeft className="size-4" /></Link></Button><Button asChild variant="outline" size="icon" className="-ml-px"><Link aria-label="Mes siguiente" href={`/app/calendar?month=${monthParam(1)}`}><ChevronRight className="size-4" /></Link></Button></div>} />
    <div className="overflow-x-auto rounded-xl border bg-card"><div className="min-w-[760px]"><div className="grid grid-cols-7 border-b">{weekdays.map((day) => <div key={day} className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{day}</div>)}</div><div className="grid grid-cols-7">{cells.map((day, i) => { const current = day > 0 && day <= totalDays; return <div key={i} className="min-h-28 border-b border-r p-2 last:border-r-0"><span className={current ? "text-xs font-medium" : "text-xs text-muted-foreground/30"}>{current ? day : ""}</span>{current && <div className="mt-2 space-y-1">{tasks.filter((task) => key(task.dueDate) === day).map((task) => <Link href="/app/tasks" key={task.id} className="block truncate rounded bg-muted px-1.5 py-1 text-[10px] hover:bg-primary/10">{task.planningMode === "FIXED_DEADLINE" ? "Entrega" : "Estudio"} · {task.title}</Link>)}{bosses.filter((boss) => key(boss.date) === day).map((boss) => <Link href="/app/bosses" key={boss.id} className="block truncate rounded bg-destructive/10 px-1.5 py-1 text-[10px] text-destructive">Boss · {boss.title}</Link>)}{goals.filter((goal) => key(goal.targetDate) === day).map((goal) => <Link href="/app/goals" key={goal.id} className="block truncate rounded bg-primary/10 px-1.5 py-1 text-[10px] text-primary">Meta · {goal.title}</Link>)}</div>}</div>; })}</div></div></div>
    <div className="flex flex-wrap gap-2"><Badge>Entrega / estudio</Badge><Badge className="bg-destructive/10 text-destructive">Boss</Badge><Badge className="bg-primary/10 text-primary">Objetivo</Badge></div>
  </div>;
}
