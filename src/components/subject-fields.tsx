import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const subjectIconOptions = [
  ["book-open", "Libro"],
  ["calculator", "Calculadora"],
  ["flask-conical", "Ciencias"],
  ["globe-2", "Geografía"],
  ["languages", "Idiomas"],
  ["landmark", "Historia"],
  ["palette", "Arte"],
  ["dumbbell", "Educación física"],
  ["music", "Música"],
  ["laptop", "Tecnología"],
] as const;

type SubjectValues = {
  name?: string;
  color?: string;
  icon?: string;
  teacher?: string | null;
  room?: string | null;
  difficulty?: number;
  notes?: string | null;
};

export function SubjectFields({ values = {}, prefix = "subject" }: { values?: SubjectValues; prefix?: string }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`${prefix}-name`}>Nombre</Label><Input id={`${prefix}-name`} name="name" defaultValue={values.name} required maxLength={80} /></div>
    <div className="space-y-1.5"><Label htmlFor={`${prefix}-icon`}>Icono</Label><Select id={`${prefix}-icon`} name="icon" defaultValue={values.icon ?? "book-open"}>{subjectIconOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
    <div className="space-y-1.5"><Label htmlFor={`${prefix}-color`}>Color</Label><Select id={`${prefix}-color`} name="color" defaultValue={values.color ?? "blue"}><option value="slate">Pizarra</option><option value="blue">Azul</option><option value="green">Verde</option><option value="amber">Ámbar</option><option value="rose">Rosa</option><option value="violet">Violeta</option><option value="cyan">Cian</option><option value="orange">Naranja</option></Select></div>
    <div className="space-y-1.5"><Label htmlFor={`${prefix}-teacher`}>Profesor/a</Label><Input id={`${prefix}-teacher`} name="teacher" defaultValue={values.teacher ?? ""} maxLength={80} /></div>
    <div className="space-y-1.5"><Label htmlFor={`${prefix}-room`}>Aula</Label><Input id={`${prefix}-room`} name="room" defaultValue={values.room ?? ""} maxLength={40} /></div>
    <div className="space-y-1.5"><Label htmlFor={`${prefix}-difficulty`}>Dificultad</Label><Select id={`${prefix}-difficulty`} name="difficulty" defaultValue={String(values.difficulty ?? 3)}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</Select></div>
    <div className="space-y-1.5 sm:col-span-2 lg:col-span-4"><Label htmlFor={`${prefix}-notes`}>Notas de la asignatura</Label><Textarea id={`${prefix}-notes`} name="notes" defaultValue={values.notes ?? ""} maxLength={2000} /></div>
  </div>;
}
