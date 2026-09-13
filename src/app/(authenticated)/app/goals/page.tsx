import { Trash2 } from "lucide-react";
import {
  createGoal,
  deleteGoal,
  updateGoal,
  updateGoalDetails,
} from "@/app/actions";
import { requireUserId } from "@/auth";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CreatePanel } from "@/components/create-panel";
import { EmptyState } from "@/components/empty-state";
import { FormSubmit } from "@/components/form-submit";
import { GoalEditor } from "@/components/goal-editor";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { normalizeTimeZone } from "@/lib/domain/dates";
import { prisma } from "@/lib/prisma";
import { formatDateOnly } from "@/lib/utils";

export default async function GoalsPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const timeZone = normalizeTimeZone(user.timezone);
  const [subjects, goals] = await Promise.all([
    prisma.subject.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.goal.findMany({
      where: { userId },
      orderBy: [{ isComplete: "asc" }, { targetDate: "asc" }, { title: "asc" }],
      include: { subject: { select: { name: true } } },
    }),
  ]);
  const subjectOptions = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
      <PageHeader
        eyebrow="Dirección"
        title="Objetivos"
        actions={<span className="text-xs text-muted-foreground">Zona: <span className="font-medium text-foreground">{timeZone}</span></span>}
        description="Organiza metas académicas y personales, con progreso visible y sin suposiciones automáticas."
      />
      <CreatePanel label="Nuevo objetivo">
        <form
          action={createGoal}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"
        >
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="goal-title">Título</Label>
            <Input
              id="goal-title"
              name="title"
              required
              maxLength={160}
              placeholder="Qué quieres conseguir"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-category">Tipo</Label>
            <Select
              id="goal-category"
              name="category"
              defaultValue="ACADEMIC"
              required
            >
              <option value="ACADEMIC">Académico</option>
              <option value="PERSONAL">Personal</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-subject">Asignatura</Label>
            <Select id="goal-subject" name="subjectId">
              <option value="">Sin asignatura</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-date">Fecha objetivo</Label>
            <Input id="goal-date" name="targetDate" type="date" />
          </div>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="goal-progress">Progreso (%)</Label>
              <Input
                id="goal-progress"
                name="progress"
                type="number"
                min={0}
                max={100}
                defaultValue={0}
                required
              />
            </div>
            <FormSubmit>Crear</FormSubmit>
          </div>
        </form>
      </CreatePanel>
      {goals.length ? (
        <div className="grid gap-3">
          {goals.map((goal) => (
            <Card key={goal.id}>
              <CardHeader>
                <div>
                  <CardTitle>{goal.title}</CardTitle>
                  <CardDescription>
                    {goal.category === "ACADEMIC" ? "Académico" : "Personal"}
                    {goal.subject ? ` · ${goal.subject.name}` : ""} ·{" "}
                    {goal.targetDate
                      ? `Objetivo: ${formatDateOnly(goal.targetDate)}`
                      : "Sin fecha"}
                  </CardDescription>
                </div>
                <form action={deleteGoal}>
                  <input type="hidden" name="id" value={goal.id} />
                  <ConfirmSubmit
                    message={`¿Eliminar el objetivo «${goal.title}»?`}
                    ariaLabel={`Eliminar ${goal.title}`}
                  >
                    <Trash2 className="size-4" />
                  </ConfirmSubmit>
                </form>
              </CardHeader>
              <CardContent>
                <Progress
                  value={goal.progress}
                  label={`Progreso de ${goal.title}`}
                />
                <form
                  action={updateGoal}
                  className="mt-3 flex items-center gap-2"
                >
                  <input type="hidden" name="id" value={goal.id} />
                  <Input
                    aria-label={`Nuevo progreso de ${goal.title}`}
                    className="h-8 max-w-28"
                    name="progress"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={goal.progress}
                  />
                  <FormSubmit>Actualizar progreso</FormSubmit>
                  <span className="text-xs text-muted-foreground">
                    {goal.progress}%{goal.isComplete ? " · Completado" : ""}
                  </span>
                </form>
                <GoalEditor
                  action={updateGoalDetails}
                  goal={goal}
                  subjects={subjectOptions}
                  timeZone={timeZone}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No hay objetivos"
          description="Crea uno cuando quieras concretar una meta académica o personal."
        />
      )}
    </div>
  );
}
