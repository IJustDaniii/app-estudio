import { Trash2 } from "lucide-react";
import { createGrade, deleteGrade } from "@/app/actions";
import { requireUserId } from "@/auth";
import { CreatePanel } from "@/components/create-panel";
import { EmptyState } from "@/components/empty-state";
import { FormSubmit } from "@/components/form-submit";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function GradesPage() {
  const userId = await requireUserId();
  const [subjects, grades] = await Promise.all([
    prisma.subject.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.grade.findMany({ where: { userId }, orderBy: { date: "desc" }, include: { subject: true } }),
  ]);
  const average = grades.length ? grades.reduce((sum, grade) => sum + grade.value, 0) / grades.length : null;
  return <div className="mx-auto max-w-5xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Seguimiento" title="Notas" description="Registro simple, sin ponderaciones ni fórmulas de media avanzadas." />
    <CreatePanel label="Añadir nota"><form action={createGrade} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><div className="space-y-1.5 lg:col-span-2"><Label htmlFor="grade-label">Concepto</Label><Input id="grade-label" name="label" required maxLength={100} /></div><div className="space-y-1.5"><Label htmlFor="grade-subject">Asignatura</Label><Select id="grade-subject" name="subjectId" required>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div><div className="space-y-1.5"><Label htmlFor="grade-value">Nota</Label><Input id="grade-value" name="value" type="number" min={0} max={10} step="0.1" required /></div><div className="flex items-end gap-2"><Input aria-label="Fecha" name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required /><FormSubmit>Añadir</FormSubmit></div></form></CreatePanel>
    <Card><CardContent className="flex items-baseline justify-between pt-5"><p className="text-sm text-muted-foreground">Media simple registrada</p><p className="text-3xl font-semibold tracking-tight">{average?.toFixed(2) ?? "—"}</p></CardContent></Card>
    {grades.length ? <ul className="rounded-xl border bg-card px-4">{grades.map((grade) => <li key={grade.id} className="flex items-center gap-3 border-b py-3 last:border-0"><div className="grid size-11 place-items-center rounded-lg bg-muted text-lg font-semibold">{grade.value.toFixed(1)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{grade.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{grade.subject.name} · {formatDate(grade.date)}</p></div><form action={deleteGrade}><input type="hidden" name="id" value={grade.id} /><Button type="submit" variant="ghost" size="icon" aria-label={`Eliminar ${grade.label}`}><Trash2 className="size-4" /></Button></form></li>)}</ul> : <EmptyState title="No hay notas" description="Añade la primera calificación cuando la tengas." />}
  </div>;
}
