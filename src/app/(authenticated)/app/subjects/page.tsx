import { Trash2 } from "lucide-react";
import { createSubject, createTopic, deleteSubject } from "@/app/actions";
import { requireUserId } from "@/auth";
import { CreatePanel } from "@/components/create-panel";
import { FormSubmit } from "@/components/form-submit";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";

const colors: Record<string, string> = { slate: "bg-slate-500", blue: "bg-blue-500", green: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500", violet: "bg-violet-500", cyan: "bg-cyan-500", orange: "bg-orange-500" };

export default async function SubjectsPage() {
  const userId = await requireUserId();
  const subjects = await prisma.subject.findMany({ where: { userId }, orderBy: { name: "asc" }, include: { topics: { orderBy: { name: "asc" } }, _count: { select: { tasks: true, bosses: true, materials: true } } } });
  return <div className="mx-auto max-w-5xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Configuración" title="Asignaturas" description="La base común para tareas, horario, Bosses, temas y materiales." />
    <CreatePanel label="Nueva asignatura"><form action={createSubject} className="grid gap-4 sm:grid-cols-[1fr_180px_auto]"><div className="space-y-1.5"><Label htmlFor="subject-name">Nombre</Label><Input id="subject-name" name="name" required maxLength={80} /></div><div className="space-y-1.5"><Label htmlFor="subject-color">Color</Label><Select id="subject-color" name="color" defaultValue="blue">{Object.keys(colors).map((color) => <option key={color} value={color}>{color}</option>)}</Select></div><FormSubmit className="self-end">Añadir</FormSubmit></form></CreatePanel>
    <CreatePanel label="Nuevo tema o unidad"><form action={createTopic} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"><div className="space-y-1.5"><Label htmlFor="topic-name">Nombre</Label><Input id="topic-name" name="name" required maxLength={120} /></div><div className="space-y-1.5"><Label htmlFor="topic-subject">Asignatura</Label><Select id="topic-subject" name="subjectId" required><option value="">Selecciona una asignatura</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></div><FormSubmit className="self-end">Añadir</FormSubmit></form></CreatePanel>
    <ul className="grid gap-3 sm:grid-cols-2">{subjects.map((subject) => <li key={subject.id} className="flex items-start gap-3 rounded-xl border bg-card p-4"><span className={`mt-1.5 size-2.5 rounded-full ${colors[subject.color] ?? colors.slate}`} aria-hidden /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{subject.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{subject._count.tasks} tareas · {subject._count.bosses} Bosses · {subject._count.materials} materiales</p>{subject.topics.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Temas: {subject.topics.map((topic) => topic.name).join(" · ")}</p>}<a className="mt-2 inline-block text-xs text-primary underline-offset-2 hover:underline" href={`/app/materials?subjectId=${subject.id}`}>Ver o adjuntar materiales</a></div><form action={deleteSubject}><input type="hidden" name="id" value={subject.id} /><Button type="submit" variant="ghost" size="icon" aria-label={`Eliminar ${subject.name}`}><Trash2 className="size-4" /></Button></form></li>)}</ul>
  </div>;
}
