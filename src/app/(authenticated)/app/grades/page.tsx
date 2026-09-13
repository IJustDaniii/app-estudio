import { Trash2 } from "lucide-react";
import { createGrade, deleteGrade, updateGrade } from "@/app/actions";
import { requireUserId } from "@/auth";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CreatePanel } from "@/components/create-panel";
import { EmptyState } from "@/components/empty-state";
import { FormSubmit } from "@/components/form-submit";
import { GradeCalculator } from "@/components/grade-calculator";
import { GradeEditor } from "@/components/grade-editor";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { calculateWeightedAverage, gradeEvolution } from "@/lib/domain/academic-rules";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default async function GradesPage() {
  const userId = await requireUserId();
  const subjects = await prisma.subject.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { grades: { orderBy: { date: "asc" } } },
  });
  const summaries = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    weightedSum: subject.grades.reduce((sum, grade) => sum + grade.value * grade.weight, 0),
    totalWeight: subject.grades.reduce((sum, grade) => sum + grade.weight, 0),
  }));

  return <div className="mx-auto max-w-5xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
    <PageHeader eyebrow="Seguimiento" title="Notas" description="Registra tus calificaciones, sus pesos y cómo evoluciona tu media por asignatura." />
    {subjects.length ? <CreatePanel label="Añadir nota"><form action={createGrade} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className="space-y-1.5 lg:col-span-2"><Label htmlFor="grade-label">Concepto</Label><Input id="grade-label" name="label" required maxLength={100} placeholder="Examen, práctica…" /></div>
      <div className="space-y-1.5"><Label htmlFor="grade-subject">Asignatura</Label><Select id="grade-subject" name="subjectId" required>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></div>
      <div className="space-y-1.5"><Label htmlFor="grade-value">Nota</Label><Input id="grade-value" name="value" type="number" min={0} max={10} step="0.1" required /></div>
      <div className="space-y-1.5"><Label htmlFor="grade-weight">Peso</Label><Input id="grade-weight" name="weight" type="number" min="0.01" max={100} step="0.1" defaultValue="1" required /></div>
      <div className="flex items-end gap-2"><div className="min-w-0 flex-1 space-y-1.5"><Label htmlFor="grade-date">Fecha</Label><Input id="grade-date" name="date" type="date" defaultValue={todayInputValue()} required /></div><FormSubmit>Añadir</FormSubmit></div>
    </form></CreatePanel> : <EmptyState title="Crea una asignatura antes de añadir notas" description="Las calificaciones siempre pertenecen a una asignatura." />}
    <GradeCalculator subjects={summaries} />
    {subjects.some((subject) => subject.grades.length) ? <div className="grid gap-4 lg:grid-cols-2">{subjects.map((subject) => {
      const average = calculateWeightedAverage(subject.grades);
      const evolution = gradeEvolution(subject.grades);
      return <Card key={subject.id}>
        <CardHeader><div><CardTitle>{subject.name}</CardTitle><CardDescription>{subject.grades.length} {subject.grades.length === 1 ? "nota registrada" : "notas registradas"}</CardDescription></div><p className="text-2xl font-semibold tracking-tight">{average?.toFixed(2) ?? "—"}</p></CardHeader>
        <CardContent><p className="mb-3 text-xs text-muted-foreground">Media ponderada actual · evolución acumulada</p><ul className="divide-y rounded-lg border">{subject.grades.map((grade, index) => {
          const step = evolution[index];
          return <li key={grade.id} className="p-3"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-sm font-semibold">{grade.value.toFixed(1)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{grade.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatDate(grade.date)} · Peso {grade.weight} · Media tras esta nota: {step.average?.toFixed(2) ?? "—"}</p></div><form action={deleteGrade}><input type="hidden" name="id" value={grade.id} /><ConfirmSubmit message={`¿Eliminar la nota «${grade.label}»?`} ariaLabel={`Eliminar ${grade.label}`}><Trash2 className="size-4" /></ConfirmSubmit></form></div><GradeEditor action={updateGrade} grade={grade} subjects={subjects.map((item) => ({ id: item.id, name: item.name }))} /></li>;
        })}</ul></CardContent>
      </Card>;
    })}</div> : <EmptyState title="No hay notas" description="Añade la primera calificación cuando la tengas." />}
  </div>;
}
