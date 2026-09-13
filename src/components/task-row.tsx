import Link from "next/link";
import { Check, Clock3, Trash2 } from "lucide-react";
import { completeTask, deleteTask, updateTask } from "@/app/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { TaskEditor } from "@/components/task-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, minutesLabel } from "@/lib/utils";

type TaskRowProps = {
  task: {
    id: string; title: string; planningMode: "FIXED_DEADLINE" | "FLEXIBLE_STUDY"; type: string;
    priority: "LOW" | "MEDIUM" | "HIGH"; difficulty: number; dueDate: Date | null;
    estimatedMinutes: number; subject: { name: string } | null; subjectId?: string | null;
    notes?: string | null; status?: "PENDING" | "IN_PROGRESS" | "COMPLETED"; _count?: { materials: number };
  };
  subjects?: { id: string; name: string }[];
  compact?: boolean;
};

export function TaskRow({ task, subjects = [], compact = false }: TaskRowProps) {
  const overdue = task.dueDate && task.dueDate < new Date();
  return <li className="group flex flex-wrap items-center gap-3 border-b py-3 last:border-0">
    {task.status === "COMPLETED" ? <span className="grid size-8 place-items-center rounded-full bg-emerald-500/10 text-emerald-600" aria-label="Completada"><Check className="size-4" /></span> : <form action={completeTask}><input type="hidden" name="id" value={task.id} /><Button type="submit" variant="outline" size="icon" className="size-8 rounded-full" aria-label={`Completar ${task.title}`}><Check className="size-3.5" /></Button></form>}
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className={task.status === "COMPLETED" ? "truncate text-sm font-medium line-through opacity-60" : "truncate text-sm font-medium"}>{task.title}</p>{task.planningMode === "FIXED_DEADLINE" ? <Badge className={overdue && task.status !== "COMPLETED" ? "bg-destructive/10 text-destructive" : ""}>{overdue && task.status !== "COMPLETED" ? "Vencida" : "Entrega"}</Badge> : <Badge>Estudio flexible</Badge>}</div><div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground"><span>{task.subject?.name ?? "Sin asignatura"}</span><span>{task.type}</span>{task.dueDate && <time dateTime={task.dueDate.toISOString()}>{formatDate(task.dueDate)}</time>}<span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{minutesLabel(task.estimatedMinutes)}</span></div></div>
    {!compact && <Link className="text-xs text-primary underline-offset-2 hover:underline" href={`/app/materials?taskId=${task.id}`}>{task._count?.materials ?? 0} materiales</Link>}{!compact && <form action={deleteTask}><input type="hidden" name="id" value={task.id} /><ConfirmSubmit message={`¿Eliminar ${task.title}? Esta acción no se puede deshacer.`}><Trash2 className="size-4" aria-hidden="true" /></ConfirmSubmit></form>}
    {!compact && <div className="basis-full"><TaskEditor action={updateTask} task={{ ...task, subjectId: task.subjectId ?? null, notes: task.notes ?? null, status: task.status ?? "PENDING" }} subjects={subjects} /></div>}
  </li>;
}
