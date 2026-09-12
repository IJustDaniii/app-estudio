"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { recordStudySession } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Item = { id: string; name?: string; title?: string };

export function StudyTimer({ subjects, tasks, initialMinutes, initialTaskId }: { subjects: Item[]; tasks: Item[]; initialMinutes: number; initialTaskId?: string }) {
  const [plannedMinutes, setPlannedMinutes] = useState(initialMinutes);
  const [remaining, setRemaining] = useState(initialMinutes * 60);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [taskId, setTaskId] = useState(initialTaskId ?? "");
  const elapsed = plannedMinutes * 60 - remaining;
  const durationOptions = useMemo(
    () => Array.from(new Set([15, 25, 30, 45, 60, 90, initialMinutes])).sort((a, b) => a - b),
    [initialMinutes],
  );

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setRemaining((value) => {
      if (value <= 1) {
        setRunning(false);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const display = useMemo(() => `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`, [remaining]);
  const start = () => { if (!startedAt) setStartedAt(new Date()); setRunning(true); };
  const reset = () => { setRunning(false); setStartedAt(null); setRemaining(plannedMinutes * 60); };
  const changeDuration = (value: string) => { const minutes = Number(value); setPlannedMinutes(minutes); if (!startedAt) setRemaining(minutes * 60); };

  const clock = <div className="mx-auto w-full max-w-2xl text-center">
    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Sesión de estudio</p>
    <p className="mt-5 font-mono text-7xl font-semibold tabular-nums tracking-[-0.08em] sm:text-9xl" aria-live="polite">{display}</p>
    <p className="mt-3 text-sm text-muted-foreground">{running ? "Concentración activa" : startedAt ? "Sesión en pausa" : "Lista para empezar"}</p>
    <div className="mx-auto mt-8 flex max-w-sm justify-center gap-2">
      {running ? <Button size="lg" variant="secondary" onClick={() => setRunning(false)}><Pause className="size-4" />Pausar</Button> : <Button size="lg" onClick={start}><Play className="size-4" />{startedAt ? "Continuar" : "Empezar"}</Button>}
      <Button size="lg" variant="outline" onClick={reset}><RotateCcw className="size-4" />Reiniciar</Button>
    </div>
    {startedAt && <form action={recordStudySession} className="mt-4">
      <input type="hidden" name="startedAt" value={startedAt.toISOString()} />
      <input type="hidden" name="endedAt" value={new Date().toISOString()} />
      <input type="hidden" name="plannedMinutes" value={plannedMinutes} />
      <input type="hidden" name="actualMinutes" value={Math.floor(elapsed / 60)} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="taskId" value={taskId} />
      <Button type="submit" variant="ghost" disabled={elapsed < 60}><Square className="size-4" />Finalizar y guardar</Button>
      {elapsed < 60 && <p className="mt-2 text-xs text-muted-foreground">Podrás guardar al completar el primer minuto.</p>}
    </form>}
  </div>;

  if (running) {
    return <div className="fixed inset-0 z-50 grid place-items-center bg-background px-5" role="dialog" aria-modal="true" aria-label="Modo de concentración">{clock}</div>;
  }

  return <section className="rounded-xl border bg-card p-6 sm:p-10">
      {!startedAt && <div className="mx-auto mb-10 grid max-w-2xl gap-4 text-left sm:grid-cols-3">
        <div className="space-y-1.5"><Label htmlFor="timer-duration">Duración</Label><Select id="timer-duration" value={plannedMinutes} onChange={(event) => changeDuration(event.target.value)}>{durationOptions.map((value) => <option key={value} value={value}>{value} min</option>)}</Select></div>
        <div className="space-y-1.5"><Label htmlFor="timer-subject">Asignatura</Label><Select id="timer-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Sin asignatura</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></div>
        <div className="space-y-1.5"><Label htmlFor="timer-task">Tarea</Label><Select id="timer-task" value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">Sin tarea</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</Select></div>
      </div>}
      {clock}
    </section>;
}
