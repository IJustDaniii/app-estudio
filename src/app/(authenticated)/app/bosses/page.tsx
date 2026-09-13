import { Swords, Trash2 } from "lucide-react";
import { createBoss, deleteBoss, updateBoss } from "@/app/actions";
import { requireUserId } from "@/auth";
import { BossEditor } from "@/components/boss-editor";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CreatePanel } from "@/components/create-panel";
import { EmptyState } from "@/components/empty-state";
import { FormSubmit } from "@/components/form-submit";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { gradeDifference } from "@/lib/domain/academic-rules";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

const bossStatusLabels = { UPCOMING: "Próximo", PREPARED: "Preparado", COMPLETED: "Realizado" } as const;

export default async function BossesPage() {
  const userId = await requireUserId();
  const [subjects, bosses] = await Promise.all([
    prisma.subject.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.boss.findMany({ where: { userId }, orderBy: { date: "asc" }, include: { subject: true, _count: { select: { materials: true } } } }),
  ]);
  return <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Exámenes" title="Bosses" description="Cada examen conserva sus temas, preparación, estado, materiales y comparación de notas." />
    <CreatePanel label="Nuevo Boss"><form action={createBoss} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><div className="space-y-1.5 md:col-span-2"><Label htmlFor="boss-title">Nombre</Label><Input id="boss-title" name="title" required maxLength={120} /></div><div className="space-y-1.5"><Label htmlFor="boss-subject">Asignatura</Label><Select id="boss-subject" name="subjectId" required>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></div><div className="space-y-1.5"><Label htmlFor="boss-date">Fecha</Label><Input id="boss-date" name="date" type="datetime-local" required /></div><div className="space-y-1.5 md:col-span-2"><Label htmlFor="boss-topics">Temas, uno por línea</Label><Textarea id="boss-topics" name="topics" required maxLength={1000} /></div><div className="space-y-1.5"><Label htmlFor="boss-difficulty">Dificultad</Label><Select id="boss-difficulty" name="difficulty" defaultValue="3">{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</Select></div><div className="space-y-1.5"><Label htmlFor="boss-preparation">Preparación (%)</Label><Input id="boss-preparation" name="preparation" type="number" min={0} max={100} defaultValue={0} required /></div><div className="space-y-1.5"><Label htmlFor="boss-status">Estado</Label><Select id="boss-status" name="status"><option value="UPCOMING">Próximo</option><option value="PREPARED">Preparado</option><option value="COMPLETED">Realizado</option></Select></div>{[["targetGrade", "Nota objetivo"], ["expectedGrade", "Nota esperada"], ["actualGrade", "Nota real"]].map(([name, label]) => <div key={name} className="space-y-1.5"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type="number" min={0} max={10} step="0.1" /></div>)}<FormSubmit className="self-end">Crear Boss</FormSubmit></form></CreatePanel>
    {bosses.length ? <div className="grid gap-4 md:grid-cols-2">{bosses.map((boss) => { const comparison = gradeDifference(boss.expectedGrade, boss.actualGrade); return <Card key={boss.id}><CardHeader><div><Badge>{boss.subject.name}</Badge><CardTitle className="mt-2 text-base">{boss.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{formatDate(boss.date, { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p></div><form action={deleteBoss}><input type="hidden" name="id" value={boss.id} /><ConfirmSubmit ariaLabel={`Eliminar ${boss.title}`} message={`¿Eliminar ${boss.title}? Esta acción no se puede deshacer.`}><Trash2 className="size-4" aria-hidden="true" /></ConfirmSubmit></form></CardHeader><CardContent><div className="mb-4 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Swords className="size-4" /></span><div className="flex-1"><div className="mb-1 flex justify-between text-xs"><span>Preparación</span><span className="font-medium">{boss.preparation}%</span></div><Progress value={boss.preparation} label={`Preparación de ${boss.title}`} /></div></div><div className="flex flex-wrap gap-1.5"><Badge>{bossStatusLabels[boss.status]}</Badge>{boss.topics.map((topic) => <Badge key={topic}>{topic}</Badge>)}</div><a className="mt-3 inline-block text-xs text-primary underline-offset-2 hover:underline" href={`/app/materials?bossId=${boss.id}`}>Ver o adjuntar materiales ({boss._count.materials})</a><div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center"><div><p className="text-[10px] uppercase text-muted-foreground">Objetivo</p><p className="font-semibold">{boss.targetGrade ?? "—"}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Esperada</p><p className="font-semibold">{boss.expectedGrade ?? "—"}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Real</p><p className="font-semibold">{boss.actualGrade ?? "—"}</p></div></div>{comparison && <p className={`mt-3 text-center text-xs font-medium ${comparison.value < 0 ? "text-destructive" : "text-emerald-600"}`}>{comparison.label}: {comparison.value > 0 ? "+" : ""}{comparison.value.toFixed(2)} puntos</p>}<BossEditor action={updateBoss} boss={boss} subjects={subjects} /></CardContent></Card>; })}</div> : <EmptyState title="No hay Bosses" description="Añade un examen para seguir su preparación." />}
  </div>;
}
