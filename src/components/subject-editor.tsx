import { updateSubject } from "@/app/actions";
import { FormSubmit } from "@/components/form-submit";
import { SubjectFields } from "@/components/subject-fields";

type SubjectEditorValues = {
  id: string;
  name: string;
  color: string;
  icon: string;
  teacher: string | null;
  room: string | null;
  difficulty: number;
  notes: string | null;
};

export function SubjectEditor({ subject }: { subject: SubjectEditorValues }) {
  return <details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Editar datos de la asignatura</summary><form action={updateSubject} className="mt-4 space-y-4"><input type="hidden" name="id" value={subject.id} /><SubjectFields prefix={`edit-${subject.id}`} values={subject} /><FormSubmit>Guardar cambios</FormSubmit></form></details>;
}
