import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSubject } from "@/app/actions";
import { requireUserId } from "@/auth";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PageHeader } from "@/components/page-header";
import { SubjectEditor } from "@/components/subject-editor";
import { SubjectIcon } from "@/components/subject-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  calculateWeightedAverage,
  gradeDifference,
  gradeEvolution,
} from "@/lib/domain/academic-rules";
import { dateOnlyInputValue, normalizeTimeZone } from "@/lib/domain/dates";
import { prisma } from "@/lib/prisma";
import { topicMaterialsHref } from "@/lib/materials/links";
import { formatDate as formatDateInZone, minutesLabel } from "@/lib/utils";

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
const bossStatusLabels = {
  UPCOMING: "Próximo",
  PREPARED: "Preparado",
  COMPLETED: "Realizado",
} as const;

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const timeZone = normalizeTimeZone(user.timezone);
  const formatDate = (
    value: Date | string | null,
    options?: Intl.DateTimeFormatOptions,
  ) => formatDateInZone(value, options, timeZone);
  const subjectRecord = await prisma.subject.findFirst({
    where: { id, userId },
    include: {
      topics: {
        orderBy: { name: "asc" },
        include: { _count: { select: { materials: true } } },
      },
      tasks: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        include: { _count: { select: { materials: true } } },
      },
      bosses: {
        orderBy: { date: "asc" },
        include: { _count: { select: { materials: true } } },
      },
      grades: { orderBy: { date: "asc" } },
      materials: {
        orderBy: { uploadedAt: "desc" },
        include: {
          topic: { select: { name: true } },
          task: { select: { title: true } },
          boss: { select: { title: true } },
        },
      },
      goals: { orderBy: [{ isComplete: "asc" }, { targetDate: "asc" }] },
    },
  });
  if (!subjectRecord) notFound();
  const dateOnlyForDisplay = (date: Date | null) => {
    const key = dateOnlyInputValue(date);
    return key ? new Date(`${key}T12:00:00.000Z`) : null;
  };
  const subject = {
    ...subjectRecord,
    grades: subjectRecord.grades.map((grade) => ({ ...grade, date: dateOnlyForDisplay(grade.date) as Date })),
    goals: subjectRecord.goals.map((goal) => ({ ...goal, targetDate: dateOnlyForDisplay(goal.targetDate) })),
  };

  const average = calculateWeightedAverage(subject.grades);
  const evolution = gradeEvolution(subject.grades);
  const latestGrade = subject.grades.at(-1);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
      <PageHeader
        eyebrow="Asignatura"
        title={subject.name}
        description="Todo lo relacionado con esta asignatura en un solo lugar."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/app/subjects">
              <Button variant="outline">Volver</Button>
            </Link>
            <form action={deleteSubject}>
              <input type="hidden" name="id" value={subject.id} />
              <ConfirmSubmit
                message={`¿Eliminar ${subject.name}? También se quitarán sus Bosses, notas y clases. Esta acción no se puede deshacer.`}
              >
                Eliminar
              </ConfirmSubmit>
            </form>
          </div>
        }
      />
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start gap-4">
            <span
              className={`grid size-14 shrink-0 place-items-center rounded-xl ${colors[subject.color] ?? colors.slate} text-white`}
            >
              <SubjectIcon
                icon={subject.icon}
                className="size-7"
                label={`Icono de ${subject.name}`}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{subject.name}</h2>
                <Badge>Dificultad {subject.difficulty}/5</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {subject.teacher ?? "Sin profesor"} ·{" "}
                {subject.room ?? "Sin aula"}
              </p>
              {subject.notes && (
                <p className="mt-3 whitespace-pre-wrap text-sm">
                  {subject.notes}
                </p>
              )}
              <SubjectEditor subject={subject} />
            </div>
          </div>
        </CardContent>
      </Card>
      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Media ponderada</p>
            <p className="mt-1 text-3xl font-semibold">
              {average === null ? "—" : average.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {subject.grades.length} notas registradas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Tareas</p>
            <p className="mt-1 text-3xl font-semibold">
              {
                subject.tasks.filter((task) => task.status !== "COMPLETED")
                  .length
              }
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              pendientes de {subject.tasks.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Última nota</p>
            <p className="mt-1 text-3xl font-semibold">
              {latestGrade?.value.toFixed(1) ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestGrade ? formatDate(latestGrade.date) : "Aún no hay notas"}
            </p>
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tareas</CardTitle>
            <Link
              href={`/app/tasks?subjectId=${subject.id}`}
              className="text-xs text-primary hover:underline"
            >
              Gestionar
            </Link>
          </CardHeader>
          <CardContent>
            {subject.tasks.length ? (
              <ul className="divide-y">
                {subject.tasks.map((task) => (
                  <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={
                            task.status === "COMPLETED"
                              ? "text-sm font-medium line-through opacity-60"
                              : "text-sm font-medium"
                          }
                        >
                          {task.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {task.planningMode === "FIXED_DEADLINE"
                            ? "Obligación fija"
                            : "Estudio flexible"}{" "}
                          · {task.type} · {minutesLabel(task.estimatedMinutes)}
                          {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ""}
                        </p>
                      </div>
                      <Badge>
                        {task.status === "COMPLETED"
                          ? "Completada"
                          : task.status === "IN_PROGRESS"
                            ? "En curso"
                            : "Pendiente"}
                      </Badge>
                    </div>
                    <Link
                      href={`/app/materials?taskId=${task.id}`}
                      className="mt-2 inline-block text-xs text-primary hover:underline"
                    >
                      {task._count.materials} materiales
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay tareas para esta asignatura.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Temas</CardTitle>
            <Link
              href="/app/subjects"
              className="text-xs text-primary hover:underline"
            >
              Gestionar
            </Link>
          </CardHeader>
          <CardContent>
            {subject.topics.length ? (
              <ul className="space-y-2">
                {subject.topics.map((topic) => (
                  <li
                    key={topic.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span>{topic.name}</span>
                    <Link
                      href={topicMaterialsHref(topic.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      {topic._count.materials} materiales
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay temas todavía.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Materiales</CardTitle>
            <Link
              href={`/app/materials?subjectId=${subject.id}`}
              className="text-xs text-primary hover:underline"
            >
              Gestionar
            </Link>
          </CardHeader>
          <CardContent>
            {subject.materials.length ? (
              <ul className="space-y-2">
                {subject.materials.slice(0, 12).map((material) => (
                  <li key={material.id} className="rounded-lg border px-3 py-2">
                    <p className="truncate text-sm font-medium">
                      {material.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {[
                        material.topic?.name,
                        material.task?.title,
                        material.boss?.title,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Material de la asignatura"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay materiales asociados.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bosses</CardTitle>
            <Link
              href="/app/bosses"
              className="text-xs text-primary hover:underline"
            >
              Gestionar
            </Link>
          </CardHeader>
          <CardContent>
            {subject.bosses.length ? (
              <ul className="space-y-3">
                {subject.bosses.map((boss) => {
                  const comparison = gradeDifference(
                    boss.expectedGrade,
                    boss.actualGrade,
                  );
                  return (
                    <li key={boss.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{boss.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(boss.date)} · {boss._count.materials}{" "}
                            materiales
                          </p>
                        </div>
                        <Badge>{bossStatusLabels[boss.status]}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {boss.topics.map((topic) => (
                          <Badge key={topic}>{topic}</Badge>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Preparación {boss.preparation}% · Esperada{" "}
                        {boss.expectedGrade ?? "—"} · Real{" "}
                        {boss.actualGrade ?? "—"}
                        {comparison
                          ? ` · ${comparison.label} (${comparison.value > 0 ? "+" : ""}${comparison.value})`
                          : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay Bosses para esta asignatura.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notas y evolución</CardTitle>
            <Link
              href="/app/grades"
              className="text-xs text-primary hover:underline"
            >
              Gestionar
            </Link>
          </CardHeader>
          <CardContent>
            {subject.grades.length ? (
              <>
                <ul className="space-y-2">
                  {subject.grades.map((grade, index) => (
                    <li
                      key={grade.id}
                      className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <span className="grid size-9 place-items-center rounded-md bg-background font-semibold">
                        {grade.value.toFixed(1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{grade.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Peso {grade.weight} · {formatDate(grade.date)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Media {evolution[index].average?.toFixed(2) ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  La evolución muestra la media acumulada respetando el peso de
                  cada nota.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay notas para esta asignatura.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Objetivos</CardTitle>
            <Link
              href="/app/goals"
              className="text-xs text-primary hover:underline"
            >
              Gestionar
            </Link>
          </CardHeader>
          <CardContent>
            {subject.goals.length ? (
              <ul className="space-y-3">
                {subject.goals.map((goal) => (
                  <li key={goal.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{goal.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {goal.category === "ACADEMIC"
                            ? "Académico"
                            : "Personal"}{" "}
                          ·{" "}
                          {goal.targetDate
                            ? formatDate(goal.targetDate)
                            : "Sin fecha"}
                        </p>
                      </div>
                      <span className="text-xs font-medium">
                        {goal.progress}%
                      </span>
                    </div>
                    <Progress
                      className="mt-2"
                      value={goal.progress}
                      label={`Progreso de ${goal.title}`}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay objetivos asociados a esta asignatura.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
