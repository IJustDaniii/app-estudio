import { FormSubmit } from "@/components/form-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type TimetableChangeValues = { id: string; baseEntryId: string | null; subjectId: string; date: Date; startTime: string; endTime: string; room: string | null; isCancelled: boolean };
type SubjectOption = { id: string; name: string };
type EntryOption = { id: string; label: string };

export function TimetableChangeEditor({ change, subjects, entries, action }: { change: TimetableChangeValues; subjects: SubjectOption[]; entries: EntryOption[]; action: (formData: FormData) => void | Promise<void> }) {
  return <details className="mt-3 border-t pt-2"><summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Editar cambio puntual</summary><form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="id" value={change.id} />
    <div className="space-y-1.5"><Label htmlFor={`change-date-${change.id}`}>Fecha</Label><Input id={`change-date-${change.id}`} name="date" type="date" defaultValue={change.date.toISOString().slice(0, 10)} required /></div>
    <div className="space-y-1.5"><Label htmlFor={`change-subject-${change.id}`}>Asignatura</Label><Select id={`change-subject-${change.id}`} name="subjectId" defaultValue={change.subjectId} required>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></div>
    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`change-base-${change.id}`}>Clase repetida afectada (opcional)</Label><Select id={`change-base-${change.id}`} name="baseEntryId" defaultValue={change.baseEntryId ?? ""}><option value="">Cambio independiente</option>{entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</Select></div>
    <div className="grid grid-cols-2 gap-2"><label className="space-y-1.5 text-xs font-medium text-muted-foreground">Inicio<Input name="startTime" type="time" defaultValue={change.startTime} required /></label><label className="space-y-1.5 text-xs font-medium text-muted-foreground">Fin<Input name="endTime" type="time" defaultValue={change.endTime} required /></label></div>
    <div className="space-y-1.5"><Label htmlFor={`change-room-${change.id}`}>Aula</Label><Input id={`change-room-${change.id}`} name="room" defaultValue={change.room ?? ""} maxLength={40} /></div>
    <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isCancelled" value="true" defaultChecked={change.isCancelled} /> Cancelar esta clase en esa fecha</label>
    <FormSubmit className="sm:col-span-2">Guardar cambio</FormSubmit>
  </form></details>;
}
