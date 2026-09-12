import { Swords, Trash2 } from "lucide-react";
import { createBoss, deleteBoss } from "@/app/actions";
import { requireUserId } from "@/auth";
import { CreatePanel } from "@/components/create-panel";
import { EmptyState } from "@/components/empty-state";
import { FormSubmit } from "@/components/form-submit";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function BossesPage() {
  const userId = await requireUserId();
  const [subjects, bosses] = await Promise.all([
    prisma.subject.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.boss.findMany({ where: { userId }, orderBy: { date: "asc" }, include: { subject: true, _count: { select: { materials: true } } } }),
  ]);
  return <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Exámenes" title="Bosses" description="Cada examen conserva temas, preparación, materiales y las tres notas de referencia." />
    <CreatePanel label="Nuevo Boss"><form action={createBoss} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><div className="space-y-1.5 md:col-span-2"><Label htmlFor="boss-title">Nombre</Label><Input id="boss-title" name="title" required maxLength={120} /></div><div className="space-y-1.5"><Label htmlFor="boss-subject">Asignatura</Label><Select id="boss-subject" name="subjectId" required>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></div><div className="space-y-1.5"><Label htmlFor="boss-date">Fecha</Label><Input id="boss-date" name="date" type="datetime-local" required /></div><div className="space-y-1.5 md:col-span-2"><Label htmlFor="boss-topics">Temas, uno por línea</Label><Textarea id="boss-topics" name="topics" required maxLength={1000} /></div><div className="space-y-1.5"><Label htmlFor="boss-difficulty">Dificultad</Label><Select id="boss-difficulty" name="difficulty" defaultValue="3">{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</Select></div><div className="space-y-1.5"><Label htmlFor="boss-preparation">Preparación (%)</Label><Input id="boss-preparation" name="preparation" type="number" min={0} max={100} defaultValue={0} required /></div>{[["targetGrade", "Nota objetivo"], ["expectedGrade", "Nota esperada"], ["actualGrade", "Nota real"]].map(([name, label]) => <div key={name} className="space-y-1.5"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type="number" min={0} max={10} step="0.1" /></div>)}<FormSubmit className="self-end">Crear Boss</FormSubmit></form></CreatePanel>
    {bosses.length ? <div className="grid gap-4 md:grid-cols-2">{bosses.map((boss) => <Card key={boss.id}><CardHeader><div><Badge>{boss.subject.name}</Badge><CardTitle className="mt-2 text-base">{boss.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{formatDate(boss.date, { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p></div><form action={deleteBoss}><input type="hidden" name="id" value={boss.id} /><Button type="submit" variant="ghost" size="icon" aria-label={`Eliminar ${boss.title}`}><Trash2 className="size-4" /></Button></form></CardHeader><CardContent><div className="mb-4 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Swords className="size-4" /></span><div className="flex-1"><div className="mb-1 flex justify-between text-xs"><span>Preparación</span><span className="font-medium">{boss.preparation}%</span></div><Progress value={boss.preparation} label={`Preparación de ${boss.title}`} /></div></div><div className="flex flex-wrap gap-1.5">{boss.topics.map((topic) => <Badge key={topic}>{topic}</Badge>)}</div><a className="mt-3 inline-block text-xs text-primary underline-offset-2 hover:underline" href={`/app/materials?bossId=${boss.id}`}>Ver o adjuntar materiales ({boss._count.materials})</a><div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center"><div><p className="text-[10px] uppercase text-muted-foreground">Objetivo</p><p className="font-semibold">{boss.targetGrade ?? "—"}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Esperada</p><p className="font-semibold">{boss.expectedGrade ?? "—"}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Real</p><p className="font-semibold">{boss.actualGrade ?? "—"}</p></div></div></CardContent></Card>)}</div> : <EmptyState title="No hay Bosses" description="Añade un examen para seguir su preparación." />}
  </div>;
}
