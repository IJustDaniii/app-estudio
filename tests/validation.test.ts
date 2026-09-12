import { describe, expect, it } from "vitest";
import { goalProgressSchema, registerSchema, studySessionSchema, taskSchema } from "@/lib/validation";

describe("validación de cuenta", () => {
  it("exige una contraseña suficientemente robusta", () => {
    expect(
      registerSchema.safeParse({ name: "Dani", email: "dani@example.com", password: "corta" }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Dani",
        email: "dani@example.com",
        password: "Segura-123",
      }).success,
    ).toBe(true);
  });
});

describe("validación de progreso y estudio", () => {
  it("rechaza progreso no numérico", () => {
    expect(goalProgressSchema.safeParse({ id: "cm12345678901234567890123", progress: "" }).success).toBe(false);
  });

  it("rechaza una duración imposible para el intervalo registrado", () => {
    expect(studySessionSchema.safeParse({
      startedAt: "2026-09-12T10:00:00.000Z",
      endedAt: "2026-09-12T10:05:00.000Z",
      plannedMinutes: "25",
      actualMinutes: "30",
      subjectId: "",
      taskId: "",
    }).success).toBe(false);
  });
});

describe("validación de tareas", () => {
  it("exige fecha real a una obligación fija", () => {
    const result = taskSchema.safeParse({
      title: "Entregar comentario",
      planningMode: "FIXED_DEADLINE",
      type: "Entrega",
      priority: "HIGH",
      difficulty: "3",
      dueDate: "",
      estimatedMinutes: "45",
      status: "PENDING",
      notes: "",
      subjectId: "",
    });

    expect(result.success).toBe(false);
  });

  it("permite una actividad flexible sin fecha", () => {
    const result = taskSchema.safeParse({
      title: "Repasar vocabulario",
      planningMode: "FLEXIBLE_STUDY",
      type: "Estudio",
      priority: "MEDIUM",
      difficulty: "2",
      dueDate: "",
      estimatedMinutes: "25",
      status: "PENDING",
      notes: "",
      subjectId: "",
    });

    expect(result.success).toBe(true);
  });
});
