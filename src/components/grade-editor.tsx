import { FormSubmit } from "@/components/form-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type GradeValues = { id: string; label: string; subjectId: string; value: number; weight: number; date: Date };
type SubjectOption = { id: string; name: string };

export function GradeEditor({ grade, subjects, action }: { grade: GradeValues; subjects: SubjectOption[]; action: (formData: FormData) => void | Promise<void> }) {
  return <details className="mt-3 border-t pt-3"><summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Editar nota</summary><form action={action} className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={grade.id} /><div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`edit-grade-label-${grade.id}`}>Concepto</Label><Input id={`edit-grade-label-${grade.id}`} name="label" defaultValue={grade.label} maxLength={100} required /></div><div className="space-y-1.5"><Label htmlFor={`edit-grade-subject-${grade.id}`}>Asignatura</Label><Select id={`edit-grade-subject-${grade.id}`} name="subjectId" defaultValue={grade.subjectId} required>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></div><div className="space-y-1.5"><Label htmlFor={`edit-grade-value-${grade.id}`}>Nota</Label><Input id={`edit-grade-value-${grade.id}`} name="value" type="number" min={0} max={10} step="0.1" defaultValue={grade.value} required /></div><div className="space-y-1.5"><Label htmlFor={`edit-grade-weight-${grade.id}`}>Peso</Label><Input id={`edit-grade-weight-${grade.id}`} name="weight" type="number" min="0.01" max={100} step="0.1" defaultValue={grade.weight} required /></div><div className="space-y-1.5"><Label htmlFor={`edit-grade-date-${grade.id}`}>Fecha</Label><Input id={`edit-grade-date-${grade.id}`} name="date" type="date" defaultValue={grade.date.toISOString().slice(0, 10)} required /></div><FormSubmit className="sm:col-span-2">Guardar cambios</FormSubmit></form></details>;
}
