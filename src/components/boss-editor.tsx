import { FormSubmit } from "@/components/form-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { localDateTimeInputValue } from "@/lib/domain/dates";

type BossValues = {
  id: string;
  title: string;
  subjectId: string;
  date: Date;
  topics: string[];
  difficulty: number;
  preparation: number;
  status: "UPCOMING" | "PREPARED" | "COMPLETED";
  targetGrade: number | null;
  expectedGrade: number | null;
  actualGrade: number | null;
};

type SubjectOption = { id: string; name: string };

export function BossEditor({
  boss,
  subjects,
  action,
  timeZone = "Europe/Madrid",
}: {
  boss: BossValues;
  subjects: SubjectOption[];
  action: (formData: FormData) => void | Promise<void>;
  timeZone?: string;
}) {
  return (
    <details className="mt-4 border-t pt-3">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
        Editar Boss completo
      </summary>
      <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={boss.id} />
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`edit-boss-title-${boss.id}`}>Nombre</Label>
          <Input
            id={`edit-boss-title-${boss.id}`}
            name="title"
            defaultValue={boss.title}
            maxLength={120}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-boss-subject-${boss.id}`}>Asignatura</Label>
          <Select
            id={`edit-boss-subject-${boss.id}`}
            name="subjectId"
            defaultValue={boss.subjectId}
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-boss-date-${boss.id}`}>Fecha</Label>
          <Input
            id={`edit-boss-date-${boss.id}`}
            name="date"
            type="datetime-local"
            defaultValue={localDateTimeInputValue(boss.date, timeZone)}
            required
          />
          <p className="text-[11px] text-muted-foreground">
            Hora de tu zona ({timeZone}).
          </p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`edit-boss-topics-${boss.id}`}>
            Temas, uno por línea
          </Label>
          <Textarea
            id={`edit-boss-topics-${boss.id}`}
            name="topics"
            defaultValue={boss.topics.join("\n")}
            maxLength={1000}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-boss-difficulty-${boss.id}`}>Dificultad</Label>
          <Select
            id={`edit-boss-difficulty-${boss.id}`}
            name="difficulty"
            defaultValue={String(boss.difficulty)}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} / 5
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-boss-preparation-${boss.id}`}>
            Preparación (%)
          </Label>
          <Input
            id={`edit-boss-preparation-${boss.id}`}
            name="preparation"
            type="number"
            min={0}
            max={100}
            defaultValue={boss.preparation}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-boss-status-${boss.id}`}>Estado</Label>
          <Select
            id={`edit-boss-status-${boss.id}`}
            name="status"
            defaultValue={boss.status}
          >
            <option value="UPCOMING">Próximo</option>
            <option value="PREPARED">Preparado</option>
            <option value="COMPLETED">Realizado</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-boss-target-${boss.id}`}>Nota objetivo</Label>
          <Input
            id={`edit-boss-target-${boss.id}`}
            name="targetGrade"
            type="number"
            min={0}
            max={10}
            step="0.1"
            defaultValue={boss.targetGrade ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-boss-expected-${boss.id}`}>Nota esperada</Label>
          <Input
            id={`edit-boss-expected-${boss.id}`}
            name="expectedGrade"
            type="number"
            min={0}
            max={10}
            step="0.1"
            defaultValue={boss.expectedGrade ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-boss-actual-${boss.id}`}>Nota real</Label>
          <Input
            id={`edit-boss-actual-${boss.id}`}
            name="actualGrade"
            type="number"
            min={0}
            max={10}
            step="0.1"
            defaultValue={boss.actualGrade ?? ""}
          />
        </div>
        <FormSubmit className="sm:col-span-2">Guardar cambios</FormSubmit>
      </form>
    </details>
  );
}
