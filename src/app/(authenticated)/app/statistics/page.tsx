import { requireUserId } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { minutesLabel } from "@/lib/utils";

export default async function StatisticsPage() {
  const userId = await requireUserId();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const [sessions, completedTasks, grades] = await Promise.all([
    prisma.studySession.findMany({ where: { userId, startedAt: { gte: start } }, include: { subject: true }, orderBy: { startedAt: "asc" } }),
    prisma.task.count({ where: { userId, completedAt: { gte: start } } }),
    prisma.grade.findMany({ where: { userId }, select: { value: true } }),
  ]);
  const totalMinutes = sessions.reduce((sum, session) => sum + session.actualMinutes, 0);
  const average = grades.length ? grades.reduce((sum, grade) => sum + grade.value, 0) / grades.length : null;
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  const values = days.map((date) => sessions.filter((session) => session.startedAt.toDateString() === date.toDateString()).reduce((sum, session) => sum + session.actualMinutes, 0));
  const max = Math.max(60, ...values);
  const bySubject = Object.entries(sessions.reduce<Record<string, number>>((acc, session) => { const name = session.subject?.name ?? "Sin asignatura"; acc[name] = (acc[name] ?? 0) + session.actualMinutes; return acc; }, {})).sort((a, b) => b[1] - a[1]);

  return <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Últimos 7 días" title="Estadísticas" description="Resumen básico a partir de tareas, sesiones y notas registradas." />
    <section className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Tiempo estudiado</p><p className="mt-1 text-2xl font-semibold">{minutesLabel(totalMinutes)}</p></CardContent></Card><Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Tareas completadas</p><p className="mt-1 text-2xl font-semibold">{completedTasks}</p></CardContent></Card><Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Media registrada</p><p className="mt-1 text-2xl font-semibold">{average?.toFixed(2) ?? "—"}</p></CardContent></Card></section>
    <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"><Card><CardHeader><CardTitle>Minutos por día</CardTitle></CardHeader><CardContent><div className="flex h-56 items-end gap-3" role="img" aria-label={`Minutos estudiados por día: ${values.join(", ")}`}>{values.map((value, index) => <div key={days[index].toISOString()} className="flex h-full flex-1 flex-col justify-end gap-2 text-center"><span className="text-xs font-medium">{value || ""}</span><div className="min-h-1 rounded-t-md bg-primary" style={{ height: `${Math.max(2, (value / max) * 100)}%` }} /><span className="text-[10px] uppercase text-muted-foreground">{new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(days[index])}</span></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Por asignatura</CardTitle></CardHeader><CardContent>{bySubject.length ? <ul className="space-y-3">{bySubject.map(([name, minutes]) => <li key={name} className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-muted-foreground">{name}</span><strong>{minutesLabel(minutes)}</strong></li>)}</ul> : <p className="text-sm text-muted-foreground">Aún no hay sesiones esta semana.</p>}</CardContent></Card></section>
  </div>;
}
