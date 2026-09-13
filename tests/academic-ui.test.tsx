import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubjectIcon } from "@/components/subject-icon";
import { TaskEditor } from "@/components/task-editor";
import { BossEditor } from "@/components/boss-editor";
import { GradeCalculator } from "@/components/grade-calculator";
import { GradeEditor } from "@/components/grade-editor";
import { GoalEditor } from "@/components/goal-editor";

describe("interfaz del nucleo academico", () => {
  it("renderiza un icono del catalogo sin insertar texto como marcado", () => {
    const markup = renderToStaticMarkup(createElement(SubjectIcon, { icon: "calculator", label: "Matemáticas" }));
    expect(markup).toContain("aria-label=\"Matemáticas\"");
    expect(markup).toContain("<svg");
    expect(markup).not.toContain("<script");
  });

  it("muestra la confirmacion antes de enviar un borrado", () => {
    const markup = renderToStaticMarkup(createElement(ConfirmSubmit, { message: "¿Borrar?" }, "Borrar"));
    expect(markup).toContain("Borrar");
    expect(markup).toContain("type=\"submit\"");
  });

  it("ofrece edicion completa y conserva el tipo de planificacion", () => {
    const markup = renderToStaticMarkup(createElement(TaskEditor, {
      task: { id: "cm12345678901234567890123", title: "Comentario", planningMode: "FIXED_DEADLINE", type: "Entrega", priority: "HIGH", difficulty: 4, dueDate: new Date("2026-10-01T10:00:00.000Z"), estimatedMinutes: 45, status: "PENDING", notes: "Llevar impreso", subjectId: "cm12345678901234567890124" },
      subjects: [{ id: "cm12345678901234567890124", name: "Historia" }],
      action: () => undefined,
    }));
    expect(markup).toContain("Obligación fija");
    expect(markup).toContain("Estudio flexible");
    expect(markup).toContain("Llevar impreso");
    expect(markup).toContain("estimatedMinutes");
  });

  it("permite recorrer los tres estados del Boss y guardar sus notas", () => {
    const markup = renderToStaticMarkup(createElement(BossEditor, {
      action: () => undefined,
      boss: { id: "cm12345678901234567890123", title: "Examen", subjectId: "cm12345678901234567890124", date: new Date("2026-10-01T09:00:00.000Z"), topics: ["Tema 1"], difficulty: 3, preparation: 50, status: "PREPARED", targetGrade: 8, expectedGrade: 7, actualGrade: null },
      subjects: [{ id: "cm12345678901234567890124", name: "Historia" }],
    }));
    expect(markup).toContain("Próximo");
    expect(markup).toContain("Preparado");
    expect(markup).toContain("Realizado");
    expect(markup).toContain("actualGrade");
    expect(markup).toContain("Tema 1");
  });

  it("permite editar el peso de una nota y calcular la nota necesaria", () => {
    const editor = renderToStaticMarkup(createElement(GradeEditor, {
      action: () => undefined,
      grade: { id: "cm12345678901234567890123", label: "Examen", subjectId: "cm12345678901234567890124", value: 6.5, weight: 2, date: new Date("2026-09-13") },
      subjects: [{ id: "cm12345678901234567890124", name: "Historia" }],
    }));
    const calculator = renderToStaticMarkup(createElement(GradeCalculator, {
      subjects: [{ id: "cm12345678901234567890124", name: "Historia", weightedSum: 13, totalWeight: 2 }],
    }));
    expect(editor).toContain("name=\"weight\"");
    expect(editor).toContain("2");
    expect(calculator).toMatch(/nota necesaria/i);
    expect(calculator).toContain("peso de la próxima nota");
  });

  it("clasifica objetivos y permite editar todos sus datos", () => {
    const markup = renderToStaticMarkup(createElement(GoalEditor, {
      action: () => undefined,
      goal: { id: "cm12345678901234567890123", title: "Aprobar historia", category: "ACADEMIC", subjectId: "cm12345678901234567890124", targetDate: new Date("2026-12-20"), progress: 40 },
      subjects: [{ id: "cm12345678901234567890124", name: "Historia" }],
    }));
    expect(markup).toContain("Académico");
    expect(markup).toContain("Personal");
    expect(markup).toContain("name=\"subjectId\"");
    expect(markup).toContain("name=\"progress\"");
    expect(markup).toContain("value=\"40\"");
  });
});
