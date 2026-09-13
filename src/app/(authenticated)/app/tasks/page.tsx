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
import { normalizeTimeZone } from "@/lib/domain/dates";
import { prisma } from "@/lib/prisma";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; subjectId?: string }>;
}) {
  const userId = await requireUserId();
  const [user, subjects, tasks] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    }),
    prisma.subject.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: { subject: true, _count: { select: { materials: true } } },
    }),
  ]);
  const timeZone = normalizeTimeZone(user.timezone);
  const error = (await searchParams).error;
  const materialsError = error === "materials-subject-change";
  const errorMessage =
    error === "overdue-fixed-deadline"
      ? "Esta obligación fija ya está vencida y su fecha no se puede reprogramar."
      : error === "fixed-deadline-date"
        ? "Una obligación fija necesita una fecha límite."
        : error === "completed-task"
          ? "Una tarea completada no se puede volver a abrir desde este editor."
          : null;
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
      <PageHeader
        eyebrow="Planificación"
        title="Tareas"
        description="Las obligaciones conservan su fecha real; el estudio flexible queda identificado para su futura redistribución."
      />
      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {errorMessage}
        </p>
      )}
      {materialsError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          No puedes cambiar de asignatura una tarea que tiene materiales
          asociados. Modifica o elimina esos materiales antes de moverla.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Zona horaria de las fechas:{" "}
        <span className="font-medium text-foreground">{timeZone}</span>.
      </p>
      <CreatePanel label="Nueva tarea">
        <form
          action={createTask}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="task-title">Título</Label>
            <Input id="task-title" name="title" required maxLength={160} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-subject">Asignatura</Label>
            <Select id="task-subject" name="subjectId">
              <option value="">Sin asignatura</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-kind">Planificación</Label>
            <Select id="task-kind" name="planningMode">
              <option value="FIXED_DEADLINE">Obligación con fecha</option>
              <option value="FLEXIBLE_STUDY">Estudio flexible</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-type">Tipo</Label>
            <Input
              id="task-type"
              name="type"
              required
              placeholder="Entrega, repaso…"
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-priority">Prioridad</Label>
            <Select id="task-priority" name="priority" defaultValue="MEDIUM">
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-difficulty">Dificultad</Label>
            <Select id="task-difficulty" name="difficulty" defaultValue="3">
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-duration">Duración estimada</Label>
            <Input
              id="task-duration"
              name="estimatedMinutes"
              type="number"
              min={5}
              max={600}
              step={5}
              defaultValue={30}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-date">Fecha límite / orientativa</Label>
            <Input id="task-date" name="dueDate" type="datetime-local" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-status">Estado</Label>
            <Select id="task-status" name="status">
              <option value="PENDING">Pendiente</option>
              <option value="IN_PROGRESS">En curso</option>
              <option value="COMPLETED">Completada</option>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
            <Label htmlFor="task-notes">Notas</Label>
            <Textarea id="task-notes" name="notes" maxLength={2000} />
          </div>
          <FormSubmit className="self-end">Crear tarea</FormSubmit>
        </form>
      </CreatePanel>
      {tasks.length ? (
        <ul className="rounded-xl border bg-card px-4 sm:px-5">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              subjects={subjects}
              timeZone={timeZone}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No hay tareas"
          description="Crea una obligación o una actividad de estudio flexible."
        />
      )}
    </div>
  );
}
