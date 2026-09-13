import Link from "next/link";
import {
  createSubject,
  createTopic,
  deleteSubject,
  deleteTopic,
  updateTopic,
} from "@/app/actions";
import { requireUserId } from "@/auth";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CreatePanel } from "@/components/create-panel";
import { FormSubmit } from "@/components/form-submit";
import { PageHeader } from "@/components/page-header";
import { SubjectEditor } from "@/components/subject-editor";
import { SubjectFields } from "@/components/subject-fields";
import { SubjectIcon } from "@/components/subject-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { calculateWeightedAverage } from "@/lib/domain/academic-rules";
import { prisma } from "@/lib/prisma";

const colors: Record<string, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
};

export default async function SubjectsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const userId = await requireUserId();
  const materialsError = (await searchParams).error === "materials-subject-change";
  const subjects = await prisma.subject.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      topics: { orderBy: { name: "asc" } },
      grades: { select: { value: true, weight: true, date: true } },
      _count: {
        select: { tasks: true, bosses: true, materials: true, goals: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
      <PageHeader
        eyebrow="Configuración"
        title="Asignaturas"
        actions={materialsError ? <span role="alert" className="text-xs text-destructive">No puedes mover un tema que tiene materiales asociados. Modifica o elimina esos materiales antes.</span> : undefined}
        description="La base común para tareas, horario, Bosses, temas, materiales y notas."
      />
      <CreatePanel label="Nueva asignatura">
        <form action={createSubject} className="space-y-4">
          <SubjectFields prefix="new-subject" />
          <FormSubmit>Añadir asignatura</FormSubmit>
        </form>
      </CreatePanel>
      <CreatePanel label="Nuevo tema o unidad">
        <form
          action={createTopic}
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <div className="space-y-1.5">
            <Label htmlFor="topic-name">Nombre</Label>
            <Input id="topic-name" name="name" required maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-subject">Asignatura</Label>
            <Select id="topic-subject" name="subjectId" required>
              <option value="">Selecciona una asignatura</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </div>
          <FormSubmit className="self-end">Añadir tema</FormSubmit>
        </form>
      </CreatePanel>
      {subjects.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {subjects.map((subject) => {
            const average = calculateWeightedAverage(subject.grades);
            return (
              <li key={subject.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-lg ${colors[subject.color] ?? colors.slate} text-white`}
                  >
                    <SubjectIcon
                      icon={subject.icon}
                      className="size-5"
                      label={`Icono de ${subject.name}`}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/app/subjects/${subject.id}`}
                      className="font-semibold hover:text-primary"
                    >
                      {subject.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {subject.teacher ?? "Sin profesor"} ·{" "}
                      {subject.room ?? "Sin aula"} · dificultad{" "}
                      {subject.difficulty}/5
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {subject._count.tasks} tareas · {subject._count.bosses}{" "}
                      Bosses · {subject._count.materials} materiales ·{" "}
                      {subject._count.goals} objetivos
                    </p>
                    <p className="mt-1 text-xs font-medium">
                      Media ponderada:{" "}
                      {average === null ? "—" : average.toFixed(2)}
                    </p>
                  </div>
                  <form action={deleteSubject}>
                    <input type="hidden" name="id" value={subject.id} />
                    <ConfirmSubmit
                      message={`¿Eliminar ${subject.name}? También se quitarán sus Bosses, notas y clases. Esta acción no se puede deshacer.`}
                    >
                      Eliminar
                    </ConfirmSubmit>
                  </form>
                </div>
                {subject.topics.length > 0 && (
                  <div className="mt-4 space-y-2 border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Temas
                    </p>
                    {subject.topics.map((topic) => (
                      <div key={topic.id} className="flex items-center gap-2">
                        <form
                          action={updateTopic}
                          className="flex min-w-0 flex-1 gap-2"
                        >
                          <input type="hidden" name="id" value={topic.id} />
                          <input
                            type="hidden"
                            name="subjectId"
                            value={subject.id}
                          />
                          <Input
                            aria-label={`Nombre del tema ${topic.name}`}
                            name="name"
                            defaultValue={topic.name}
                            maxLength={120}
                          />
                          <FormSubmit>Guardar</FormSubmit>
                        </form>
                        <form action={deleteTopic}>
                          <input type="hidden" name="id" value={topic.id} />
                          <ConfirmSubmit
                            message={`¿Eliminar el tema ${topic.name}?`}
                          >
                            Eliminar
                          </ConfirmSubmit>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-3 border-t pt-3">
                  <Link
                    href={`/app/subjects/${subject.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Abrir detalle
                  </Link>
                  <Link
                    href={`/app/materials?subjectId=${subject.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Gestionar materiales
                  </Link>
                </div>
                <SubjectEditor subject={subject} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Todavía no hay asignaturas. Crea la primera para organizar tu curso.
        </p>
      )}
    </div>
  );
}
