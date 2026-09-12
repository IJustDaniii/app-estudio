import { Trash2 } from "lucide-react";
import {
  createTimetableEntry,
  deleteTimetableEntry,
  updateTimetableEntry,
} from "@/app/actions";
import { requireUserId } from "@/auth";
import { CreatePanel } from "@/components/create-panel";
import { FormSubmit } from "@/components/form-submit";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export default async function TimetablePage() {
  const userId = await requireUserId();
  const [subjects, entries] = await Promise.all([
    prisma.subject.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.timetableEntry.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include: { subject: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
      <PageHeader
        eyebrow="Semana"
        title="Horario"
        description="Añade, modifica o elimina clases. No se generan eventos fuera de lo que configures."
      />
      <CreatePanel label="Añadir clase">
        <form action={createTimetableEntry} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="tt-subject">Asignatura</Label>
            <Select id="tt-subject" name="subjectId" required>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tt-day">Día</Label>
            <Select id="tt-day" name="dayOfWeek">
              {days.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">Inicio<Input name="startTime" type="time" required /></label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">Fin<Input name="endTime" type="time" required /></label>
          </div>
          <div className="flex items-end gap-2">
            <Input name="room" placeholder="Aula (opcional)" maxLength={40} />
            <FormSubmit>Añadir</FormSubmit>
          </div>
        </form>
      </CreatePanel>
      <div className="max-w-full overflow-x-auto pb-2">
        <div className="grid min-w-[900px] grid-cols-5 gap-3">
          {days.map((day, index) => (
            <section key={day} aria-labelledby={`day-${index}`}>
              <h2 id={`day-${index}`} className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{day}</h2>
              <div className="space-y-2">
                {entries.filter((entry) => entry.dayOfWeek === index + 1).map((entry) => (
                  <article key={entry.id} className="rounded-lg border bg-card p-3">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-primary">{entry.startTime}–{entry.endTime}</p>
                        <p className="mt-1 text-sm font-medium leading-snug">{entry.subject.name}</p>
                        {entry.room && <p className="mt-1 text-xs text-muted-foreground">{entry.room}</p>}
                      </div>
                      <form action={deleteTimetableEntry}>
                        <input type="hidden" name="id" value={entry.id} />
                        <Button type="submit" variant="ghost" size="icon" className="size-7" aria-label={`Eliminar clase de ${entry.subject.name}`}><Trash2 className="size-3.5" /></Button>
                      </form>
                    </div>
                    <details className="mt-3 border-t pt-2">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Editar</summary>
                      <form action={updateTimetableEntry} className="mt-3 space-y-2">
                        <input type="hidden" name="id" value={entry.id} />
                        <Select aria-label="Asignatura" name="subjectId" defaultValue={entry.subjectId}>
                          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                        </Select>
                        <Select aria-label="Día" name="dayOfWeek" defaultValue={entry.dayOfWeek}>
                          {days.map((weekday, dayIndex) => <option key={weekday} value={dayIndex + 1}>{weekday}</option>)}
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                          <Input aria-label="Hora de inicio" name="startTime" type="time" defaultValue={entry.startTime} required />
                          <Input aria-label="Hora de fin" name="endTime" type="time" defaultValue={entry.endTime} required />
                        </div>
                        <Input aria-label="Aula" name="room" defaultValue={entry.room ?? ""} maxLength={40} />
                        <FormSubmit className="w-full">Guardar</FormSubmit>
                      </form>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
