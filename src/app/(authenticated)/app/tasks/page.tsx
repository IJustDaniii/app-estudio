import { createTask } from "@/app/actions";
import { requireUserId } from "@/auth";
import { CreatePanel } from "@/components/create-panel";
import { EmptyState } from "@/components/empty-state";
import { FormSubmit } from "@/components/form-submit";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

export default async function TasksPage() {
  const userId = await requireUserId();
  const [subjects, tasks] = await Promise.all([
    prisma.subject.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.task.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }], include: { subject: true } }),
  ]);
  return <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Planificación" title="Tareas" description="Las obligaciones conservan su fecha real; el estudio flexible queda identificado para su futura redistribución." />
    <CreatePanel label="Nueva tarea"><form action={createTask} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><div className="space-y-1.5 md:col-span-2"><Label htmlFor="task-title">Título</Label><Input id="task-title" name="title" required maxLength={160} /></div><div className="space-y-1.5"><Label htmlFor="task-subject">Asignatura</Label><Select id="task-subject" name="subjectId"><option value="">Sin asignatura</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div><div className="space-y-1.5"><Label htmlFor="task-kind">Planificación</Label><Select id="task-kind" name="planningMode"><option value="FIXED_DEADLINE">Obligación con fecha</option><option value="FLEXIBLE_STUDY">Estudio flexible</option></Select></div><div className="space-y-1.5"><Label htmlFor="task-type">Tipo</Label><Input id="task-type" name="type" required placeholder="Entrega, repaso…" maxLength={60} /></div><div className="space-y-1.5"><Label htmlFor="task-priority">Prioridad</Label><Select id="task-priority" name="priority" defaultValue="MEDIUM"><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option></Select></div><div className="space-y-1.5"><Label htmlFor="task-difficulty">Dificultad</Label><Select id="task-difficulty" name="difficulty" defaultValue="3">{[1,2,3,4,5].map((n) => <option key={n}>{n}</option>)}</Select></div><div className="space-y-1.5"><Label htmlFor="task-duration">Duración estimada</Label><Input id="task-duration" name="estimatedMinutes" type="number" min={5} max={600} step={5} defaultValue={30} required /></div><div className="space-y-1.5"><Label htmlFor="task-date">Fecha límite / orientativa</Label><Input id="task-date" name="dueDate" type="datetime-local" /></div><div className="space-y-1.5"><Label htmlFor="task-status">Estado</Label><Select id="task-status" name="status"><option value="PENDING">Pendiente</option><option value="IN_PROGRESS">En curso</option><option value="COMPLETED">Completada</option></Select></div><div className="space-y-1.5 md:col-span-2 lg:col-span-3"><Label htmlFor="task-notes">Notas</Label><Textarea id="task-notes" name="notes" maxLength={2000} /></div><FormSubmit className="self-end">Crear tarea</FormSubmit></form></CreatePanel>
    {tasks.length ? <ul className="rounded-xl border bg-card px-4 sm:px-5">{tasks.map((task) => <TaskRow key={task.id} task={task} />)}</ul> : <EmptyState title="No hay tareas" description="Crea una obligación o una actividad de estudio flexible." />}
  </div>;
}
