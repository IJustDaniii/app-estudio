import { Trash2 } from "lucide-react";
import { createTimetableChange, createTimetableEntry, deleteTimetableChange, deleteTimetableEntry, updateTimetableChange, updateTimetableEntry } from "@/app/actions";
import { requireUserId } from "@/auth";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CreatePanel } from "@/components/create-panel";
import { EmptyState } from "@/components/empty-state";
import { FormSubmit } from "@/components/form-submit";
import { PageHeader } from "@/components/page-header";
import { TimetableChangeEditor } from "@/components/timetable-change-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default async function TimetablePage() {
  const userId = await requireUserId();
  const [subjects, entries, changes] = await Promise.all([
    prisma.subject.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.timetableEntry.findMany({ where: { userId }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }], include: { subject: true } }),
    prisma.timetableChange.findMany({ where: { userId }, orderBy: [{ date: "desc" }, { startTime: "asc" }], include: { subject: true } }),
  ]);
  const entryOptions = entries.map((entry) => ({ id: entry.id, label: `${entry.subject.name} · ${days[entry.dayOfWeek - 1]} ${entry.startTime}` }));

  return <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
    <PageHeader eyebrow="Semana" title="Horario" description="Configura tus clases habituales y los cambios puntuales que solo afectan a una fecha." />
    {subjects.length ? <>
      <CreatePanel label="Añadir clase habitual"><form action={createTimetableEntry} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5 lg:col-span-2"><Label htmlFor="tt-subject">Asignatura</Label><Select id="tt-subject" name="subjectId" required>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></div>
        <div className="space-y-1.5"><Label htmlFor="tt-day">Día</Label><Select id="tt-day" name="dayOfWeek">{days.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</Select></div>
        <div className="grid grid-cols-2 gap-2"><label className="space-y-1.5 text-xs font-medium text-muted-foreground">Inicio<Input name="startTime" type="time" required /></label><label className="space-y-1.5 text-xs font-medium text-muted-foreground">Fin<Input name="endTime" type="time" required /></label></div>
        <div className="flex items-end gap-2"><Input name="room" placeholder="Aula (opcional)" maxLength={40} /><FormSubmit>Añadir</FormSubmit></div>
      </form></CreatePanel>
      <CreatePanel label="Añadir cambio puntual"><form action={createTimetableChange} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1.5"><Label htmlFor="change-create-date">Fecha</Label><Input id="change-create-date" name="date" type="date" defaultValue={todayInputValue()} required /></div>
        <div className="space-y-1.5"><Label htmlFor="change-create-subject">Asignatura</Label><Select id="change-create-subject" name="subjectId" required>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></div>
        <div className="space-y-1.5 lg:col-span-2"><Label htmlFor="change-create-base">Clase habitual afectada</Label><Select id="change-create-base" name="baseEntryId"><option value="">Cambio independiente</option>{entryOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</Select></div>
        <div className="grid grid-cols-2 gap-2"><label className="space-y-1.5 text-xs font-medium text-muted-foreground">Inicio<Input name="startTime" type="time" required /></label><label className="space-y-1.5 text-xs font-medium text-muted-foreground">Fin<Input name="endTime" type="time" required /></label></div>
        <div className="flex items-end gap-2"><Input name="room" placeholder="Aula (opcional)" maxLength={40} /><FormSubmit>Guardar</FormSubmit></div>
        <label className="flex items-center gap-2 text-sm lg:col-span-6"><input type="checkbox" name="isCancelled" value="true" /> Cancelar la clase en esa fecha</label>
      </form></CreatePanel>
    </> : <EmptyState title="Crea una asignatura antes de configurar el horario" description="Las clases y sus cambios necesitan una asignatura propia." />}
    <div className="max-w-full overflow-x-auto pb-2"><div className="grid min-w-[900px] grid-cols-5 gap-3">{days.map((day, index) => <section key={day} aria-labelledby={`day-${index}`}><h2 id={`day-${index}`} className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{day}</h2><div className="space-y-2">{entries.filter((entry) => entry.dayOfWeek === index + 1).map((entry) => <article key={entry.id} className="rounded-lg border bg-card p-3"><div className="flex justify-between gap-2"><div><p className="text-xs font-semibold text-primary">{entry.startTime}–{entry.endTime}</p><p className="mt-1 text-sm font-medium leading-snug">{entry.subject.name}</p>{entry.room && <p className="mt-1 text-xs text-muted-foreground">{entry.room}</p>}</div><form action={deleteTimetableEntry}><input type="hidden" name="id" value={entry.id} /><ConfirmSubmit message={`¿Eliminar la clase habitual de ${entry.subject.name}?`} ariaLabel={`Eliminar clase de ${entry.subject.name}`}><Trash2 className="size-3.5" /></ConfirmSubmit></form></div><details className="mt-3 border-t pt-2"><summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Editar clase habitual</summary><form action={updateTimetableEntry} className="mt-3 space-y-2"><input type="hidden" name="id" value={entry.id} /><Select aria-label="Asignatura" name="subjectId" defaultValue={entry.subjectId}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select><Select aria-label="Día" name="dayOfWeek" defaultValue={entry.dayOfWeek}>{days.map((weekday, dayIndex) => <option key={weekday} value={dayIndex + 1}>{weekday}</option>)}</Select><div className="grid grid-cols-2 gap-2"><Input aria-label="Hora de inicio" name="startTime" type="time" defaultValue={entry.startTime} required /><Input aria-label="Hora de fin" name="endTime" type="time" defaultValue={entry.endTime} required /></div><Input aria-label="Aula" name="room" defaultValue={entry.room ?? ""} maxLength={40} /><FormSubmit className="w-full">Guardar</FormSubmit></form></details></article>)}</div></section>)}</div></div>
    <section className="space-y-3"><div><h2 className="text-lg font-semibold tracking-tight">Cambios puntuales</h2><p className="text-sm text-muted-foreground">Solo afectan a la fecha que indiques.</p></div>{changes.length ? <div className="grid gap-3 lg:grid-cols-2">{changes.map((change) => <Card key={change.id}><CardContent className="pt-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">{formatDate(change.date)} · {change.isCancelled ? "Cancelada" : "Cambio puntual"}</p><p className="mt-1 text-sm font-semibold">{change.subject.name}</p><p className="mt-1 text-sm text-muted-foreground">{change.isCancelled ? "No hay clase" : `${change.startTime}–${change.endTime}${change.room ? ` · ${change.room}` : ""}`}</p></div><form action={deleteTimetableChange}><input type="hidden" name="id" value={change.id} /><ConfirmSubmit message={`¿Eliminar el cambio del ${formatDate(change.date)}?`} ariaLabel={`Eliminar cambio del ${formatDate(change.date)}`}><Trash2 className="size-4" /></ConfirmSubmit></form></div><TimetableChangeEditor action={updateTimetableChange} change={change} subjects={subjects.map((subject) => ({ id: subject.id, name: subject.name }))} entries={entryOptions} /></CardContent></Card>)}</div> : <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No hay cambios puntuales configurados.</p>}</section>
  </div>;
}
