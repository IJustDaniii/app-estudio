import { FormSubmit } from "@/components/form-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { dateOnlyInputValue } from "@/lib/domain/dates";

type GoalValues = {
  id: string;
  title: string;
  category: "ACADEMIC" | "PERSONAL";
  subjectId: string | null;
  targetDate: Date | null;
  progress: number;
};
type SubjectOption = { id: string; name: string };

export function GoalEditor({
  goal,
  subjects,
  action,
  timeZone = "Europe/Madrid",
}: {
  goal: GoalValues;
  subjects: SubjectOption[];
  action: (formData: FormData) => void | Promise<void>;
  timeZone?: string;
}) {
  return (
    <details className="mt-4 border-t pt-3">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
        Editar objetivo
      </summary>
      <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={goal.id} />
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`edit-goal-title-${goal.id}`}>Título</Label>
          <Input
            id={`edit-goal-title-${goal.id}`}
            name="title"
            defaultValue={goal.title}
            maxLength={160}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-goal-category-${goal.id}`}>Tipo</Label>
          <Select
            id={`edit-goal-category-${goal.id}`}
            name="category"
            defaultValue={goal.category}
            required
          >
            <option value="ACADEMIC">Académico</option>
            <option value="PERSONAL">Personal</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-goal-subject-${goal.id}`}>
            Asignatura (opcional)
          </Label>
          <Select
            id={`edit-goal-subject-${goal.id}`}
            name="subjectId"
            defaultValue={goal.subjectId ?? ""}
          >
            <option value="">Sin asignatura</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-goal-date-${goal.id}`}>Fecha objetivo</Label>
          <Input
            id={`edit-goal-date-${goal.id}`}
            name="targetDate"
            type="date"
          defaultValue={dateOnlyInputValue(goal.targetDate)}
          />
          <p className="text-[11px] text-muted-foreground">
            Día de tu zona ({timeZone}).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-goal-progress-${goal.id}`}>Progreso (%)</Label>
          <Input
            id={`edit-goal-progress-${goal.id}`}
            name="progress"
            type="number"
            min={0}
            max={100}
            defaultValue={goal.progress}
            required
          />
        </div>
        <FormSubmit className="sm:col-span-2">Guardar cambios</FormSubmit>
      </form>
    </details>
  );
}
