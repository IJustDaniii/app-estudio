import { Trash2 } from "lucide-react";
import { createGoal, deleteGoal, updateGoal } from "@/app/actions";
import { requireUserId } from "@/auth";
import { CreatePanel } from "@/components/create-panel";
import { EmptyState } from "@/components/empty-state";
import { FormSubmit } from "@/components/form-submit";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function GoalsPage() {
  const userId = await requireUserId();
  const goals = await prisma.goal.findMany({ where: { userId }, orderBy: [{ isComplete: "asc" }, { targetDate: "asc" }] });
  return <div className="mx-auto max-w-5xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Dirección" title="Objetivos" description="Seguimiento manual y explícito; no se infiere el progreso." />
    <CreatePanel label="Nuevo objetivo"><form action={createGoal} className="grid gap-4 sm:grid-cols-[1fr_180px_150px_auto]"><div className="space-y-1.5"><Label htmlFor="goal-title">Título</Label><Input id="goal-title" name="title" required maxLength={160} /></div><div className="space-y-1.5"><Label htmlFor="goal-date">Fecha objetivo</Label><Input id="goal-date" name="targetDate" type="date" /></div><div className="space-y-1.5"><Label htmlFor="goal-progress">Progreso (%)</Label><Input id="goal-progress" name="progress" type="number" min={0} max={100} defaultValue={0} required /></div><FormSubmit className="self-end">Crear</FormSubmit></form></CreatePanel>
    {goals.length ? <div className="grid gap-3">{goals.map((goal) => <Card key={goal.id}><CardContent className="pt-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">{goal.title}</h2><p className="mt-1 text-xs text-muted-foreground">{goal.targetDate ? `Objetivo: ${formatDate(goal.targetDate)}` : "Sin fecha"}</p></div><form action={deleteGoal}><input type="hidden" name="id" value={goal.id} /><Button type="submit" variant="ghost" size="icon" aria-label={`Eliminar ${goal.title}`}><Trash2 className="size-4" /></Button></form></div><Progress className="mt-4" value={goal.progress} label={`Progreso de ${goal.title}`} /><form action={updateGoal} className="mt-3 flex items-center gap-2"><input type="hidden" name="id" value={goal.id} /><Input aria-label={`Nuevo progreso de ${goal.title}`} className="h-8 max-w-28" name="progress" type="number" min={0} max={100} defaultValue={goal.progress} /><FormSubmit>Actualizar</FormSubmit><span className="text-xs text-muted-foreground">{goal.progress}%</span></form></CardContent></Card>)}</div> : <EmptyState title="No hay objetivos" description="Crea uno cuando quieras concretar una meta académica." />}
  </div>;
}
