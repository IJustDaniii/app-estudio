import { describe, expect, it } from "vitest";
import { bossSchema, goalProgressSchema, goalSchema, gradeSchema, registerSchema, subjectSchema, studySessionSchema, taskSchema, timetableChangeSchema } from "@/lib/validation";

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

describe("validación del núcleo académico", () => {
  const subjectId = "cm12345678901234567890123";

  it("acepta los datos completos de una asignatura", () => {
    expect(subjectSchema.safeParse({
      name: "Historia",
      color: "amber",
      icon: "landmark",
      teacher: "Ana Ruiz",
      room: "Aula 2",
      difficulty: "4",
      notes: "Preparar comentario de texto",
    }).success).toBe(true);
  });

  it("exige un peso positivo en cada nota", () => {
    expect(gradeSchema.safeParse({ label: "Control", subjectId, value: "7.5", weight: "0", date: "2026-09-13" }).success).toBe(false);
    expect(gradeSchema.safeParse({ label: "Control", subjectId, value: "7.5", weight: "2", date: "2026-09-13" }).success).toBe(true);
  });

  it("clasifica los objetivos y conserva el estado del Boss", () => {
    expect(goalSchema.safeParse({ title: "Leer una novela", category: "PERSONAL", targetDate: "", progress: "0" }).success).toBe(true);
    expect(bossSchema.safeParse({ title: "Examen", subjectId, date: "2026-10-01T09:00", topics: "Tema 1", difficulty: "3", preparation: "50", status: "PREPARED", targetGrade: "8", expectedGrade: "7", actualGrade: "" }).success).toBe(true);
  });

  it("valida un cambio puntual de horario", () => {
    expect(timetableChangeSchema.safeParse({ baseEntryId: subjectId, subjectId, date: "2026-09-15", startTime: "09:00", endTime: "10:00", room: "Aula 4", isCancelled: "false" }).success).toBe(true);
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
