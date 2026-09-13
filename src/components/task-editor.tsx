import { FormSubmit } from "@/components/form-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TaskValues = {
  id: string;
  title: string;
  planningMode: "FIXED_DEADLINE" | "FLEXIBLE_STUDY";
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  difficulty: number;
  dueDate: Date | null;
  estimatedMinutes: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  notes: string | null;
  subjectId: string | null;
};

type SubjectOption = { id: string; name: string };

function inputDateTime(date: Date | null) {
  return date ? date.toISOString().slice(0, 16) : "";
}

export function TaskEditor({ task, subjects, action }: { task: TaskValues; subjects: SubjectOption[]; action: (formData: FormData) => void | Promise<void> }) {
  const overdueFixed = task.planningMode === "FIXED_DEADLINE" && task.dueDate !== null && task.dueDate < new Date();
  return <details className="mt-3 border-t pt-3">
    <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Editar tarea completa</summary>
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={task.id} />
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`edit-task-title-${task.id}`}>Título</Label><Input id={`edit-task-title-${task.id}`} name="title" defaultValue={task.title} maxLength={160} required /></div>
      <div className="space-y-1.5"><Label htmlFor={`edit-task-subject-${task.id}`}>Asignatura</Label><Select id={`edit-task-subject-${task.id}`} name="subjectId" defaultValue={task.subjectId ?? ""}><option value="">Sin asignatura</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></div>
      <div className="space-y-1.5"><Label htmlFor={`edit-task-mode-${task.id}`}>Tipo de planificación</Label><Select id={`edit-task-mode-${task.id}`} name="planningMode" defaultValue={task.planningMode}><option value="FIXED_DEADLINE">Obligación fija</option><option value="FLEXIBLE_STUDY" disabled={overdueFixed}>Estudio flexible</option></Select>{overdueFixed && <p className="text-[11px] text-muted-foreground">Una obligación fija vencida no puede convertirse en estudio flexible.</p>}</div>
      <div className="space-y-1.5"><Label htmlFor={`edit-task-type-${task.id}`}>Tipo</Label><Input id={`edit-task-type-${task.id}`} name="type" defaultValue={task.type} maxLength={60} required /></div>
      <div className="space-y-1.5"><Label htmlFor={`edit-task-priority-${task.id}`}>Prioridad</Label><Select id={`edit-task-priority-${task.id}`} name="priority" defaultValue={task.priority}><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option></Select></div>
      <div className="space-y-1.5"><Label htmlFor={`edit-task-difficulty-${task.id}`}>Dificultad</Label><Select id={`edit-task-difficulty-${task.id}`} name="difficulty" defaultValue={String(task.difficulty)}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</Select></div>
      <div className="space-y-1.5"><Label htmlFor={`edit-task-minutes-${task.id}`}>Duración estimada</Label><Input id={`edit-task-minutes-${task.id}`} name="estimatedMinutes" type="number" min={5} max={600} step={5} defaultValue={task.estimatedMinutes} required /></div>
      <div className="space-y-1.5"><Label htmlFor={`edit-task-date-${task.id}`}>Fecha límite u orientativa</Label><Input id={`edit-task-date-${task.id}`} name="dueDate" type="datetime-local" defaultValue={inputDateTime(task.dueDate)} /><p className="text-[11px] text-muted-foreground">Las obligaciones fijas vencidas conservan su fecha.</p></div>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`edit-task-status-${task.id}`}>Estado</Label><Select id={`edit-task-status-${task.id}`} name="status" defaultValue={task.status}><option value="PENDING">Pendiente</option><option value="IN_PROGRESS">En curso</option><option value="COMPLETED">Completada</option></Select></div>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`edit-task-notes-${task.id}`}>Notas</Label><Textarea id={`edit-task-notes-${task.id}`} name="notes" defaultValue={task.notes ?? ""} maxLength={2000} /></div>
      <FormSubmit className="sm:col-span-2">Guardar cambios</FormSubmit>
    </form>
  </details>;
}
