import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Coins, Flame, Sparkles, Swords, Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GAME_RULES } from "@/lib/config/game";
import { getDashboardData } from "@/lib/dashboard-data";
import { recommendNextTask } from "@/lib/domain/planner";
import { calculateLevel } from "@/lib/domain/progress";
import { localDayBounds } from "@/lib/domain/dates";
import { formatDate, minutesLabel } from "@/lib/utils";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ minutes?: string }> }) {
  const data = await getDashboardData();
  const { minutes } = await searchParams;
  const available = Math.max(10, Math.min(240, Number(minutes) || 30));
  const recommendation = recommendNextTask(data.tasks.map((task) => ({
    id: task.id, title: task.title, planningMode: task.planningMode, priority: task.priority,
    difficulty: task.difficulty, dueDate: task.dueDate, estimatedMinutes: task.estimatedMinutes,
    relatedBossDate: task.subject?.bosses[0]?.date ?? null,
  })), data.now, available);
  const level = calculateLevel(data.user.xp);
  const dailyPercent = (data.todayStudyMinutes / GAME_RULES.dailyStudyTargetMinutes) * 100;
  const { end: endOfToday } = localDayBounds(data.now);
  const todayTasks = data.tasks.filter((task) => task.dueDate && task.dueDate < endOfToday).slice(0, 5);

  return <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
    <PageHeader eyebrow={new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(data.now)} title={`Hola, ${data.user.name.split(" ")[0]}`} description="Esto es lo importante para hoy." />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen diario">
      <Card><CardContent className="flex items-center gap-3 pt-5"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Trophy className="size-4" /></span><div><p className="text-xs text-muted-foreground">Nivel {level.level}</p><p className="text-lg font-semibold">{level.currentXp} / {level.nextLevelXp} XP</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-5"><span className="grid size-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"><Coins className="size-4" /></span><div><p className="text-xs text-muted-foreground">Monedas</p><p className="text-lg font-semibold">{data.user.coins}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-5"><span className="grid size-9 place-items-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400"><Flame className="size-4" /></span><div><p className="text-xs text-muted-foreground">Racha de estudio</p><p className="text-lg font-semibold">{data.streak} días</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-5"><span className="grid size-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Clock3 className="size-4" /></span><div><p className="text-xs text-muted-foreground">Estudiado hoy</p><p className="text-lg font-semibold">{minutesLabel(data.todayStudyMinutes)}</p></div></CardContent></Card>
    </section>

    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
      <div className="space-y-6">
        <Card><CardHeader><div><CardTitle>Hoy</CardTitle><p className="mt-1 text-sm text-muted-foreground">{data.todayCompleted} completadas · {todayTasks.length} pendientes próximas</p></div><Button asChild variant="ghost" size="sm"><Link href="/app/tasks">Ver todas <ArrowRight className="size-3.5" /></Link></Button></CardHeader><CardContent>{todayTasks.length ? <ul>{todayTasks.map((task) => <TaskRow key={task.id} task={task} compact />)}</ul> : <div className="grid min-h-36 place-items-center text-center"><div><CheckCircle2 className="mx-auto mb-2 size-6 text-emerald-500" /><p className="text-sm font-medium">Nada urgente pendiente</p><p className="mt-1 text-xs text-muted-foreground">Puedes avanzar en una actividad flexible.</p></div></div>}</CardContent></Card>

        <Card id="planner" className="border-primary/30"><CardHeader><div><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" />¿Qué hago ahora?</CardTitle><p className="mt-1 text-sm text-muted-foreground">Heurística local y transparente; no usa IA.</p></div></CardHeader><CardContent><form className="mb-4 flex items-end gap-2" action="/app" method="get"><label className="flex-1 text-xs font-medium text-muted-foreground">Tiempo disponible<input className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm" type="number" name="minutes" min="10" max="240" step="5" defaultValue={available} /></label><Button type="submit">Recomendar</Button></form>{recommendation ? <div className="rounded-lg bg-muted p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{recommendation.task.title}</p><p className="mt-1 text-sm text-muted-foreground">{minutesLabel(recommendation.task.estimatedMinutes)} · puntuación {recommendation.score}</p></div><Button asChild size="sm"><Link href={`/app/study?task=${recommendation.task.id}&minutes=${recommendation.task.estimatedMinutes}`}>Empezar <ArrowRight className="size-3.5" /></Link></Button></div><div className="mt-3 flex flex-wrap gap-1.5">{recommendation.reasons.map((reason) => <Badge key={reason}>{reason}</Badge>)}</div></div> : <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">No hay una tarea pendiente que quepa en ese tiempo.</p>}</CardContent></Card>
      </div>

      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Progreso diario</CardTitle><span className="text-sm font-semibold">{Math.min(100, Math.round(dailyPercent))}%</span></CardHeader><CardContent><Progress value={dailyPercent} label="Objetivo de estudio diario" /><p className="mt-3 text-xs text-muted-foreground">Objetivo provisional: {GAME_RULES.dailyStudyTargetMinutes} minutos.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Próximo Boss</CardTitle><Swords className="size-4 text-primary" /></CardHeader><CardContent>{data.nextBoss ? <div><p className="text-lg font-semibold">{data.nextBoss.title}</p><p className="mt-1 text-sm text-muted-foreground">{data.nextBoss.subject.name} · {formatDate(data.nextBoss.date, { weekday: "short", day: "numeric", month: "short" })}</p><div className="mt-4"><div className="mb-1.5 flex justify-between text-xs"><span>Preparación</span><span>{data.nextBoss.preparation}%</span></div><Progress value={data.nextBoss.preparation} label="Preparación del próximo Boss" /></div></div> : <p className="text-sm text-muted-foreground">No hay Bosses próximos.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Misiones diarias</CardTitle></CardHeader><CardContent className="space-y-4">{data.missions.map((mission) => <div key={mission.id}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className={mission.isComplete ? "line-through opacity-60" : ""}>{mission.title}</span><span className="text-xs text-muted-foreground">{Math.min(mission.progress, mission.target)}/{mission.target}</span></div><Progress value={(mission.progress / mission.target) * 100} label={mission.title} /></div>)}</CardContent></Card>
      </div>
    </section>
  </div>;
}
