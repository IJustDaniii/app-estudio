import { describe, expect, it } from "vitest";
import { AIActionContractError, parseAIAction } from "@/lib/ai/action-contract";

const id = "cm0000000000000000000000";

describe("acciones de IA", () => {
  it("valida una propuesta de creacion con el mismo contrato que la app", () => {
    expect(parseAIAction("create_subject", { name: "Matematicas", color: "blue" })).toMatchObject({ action: "create_subject", entity: "asignatura" });
  });

  it("rechaza marcar tareas completadas o falsificar su fecha", () => {
    expect(() => parseAIAction("update_task", { id, status: "COMPLETED" })).toThrow(AIActionContractError);
    expect(() => parseAIAction("update_task", { id, completedAt: "2026-09-13T10:00:00.000Z" })).toThrow(AIActionContractError);
  });

  it("rechaza intentos de tocar la economia o estados derivados aunque el campo no pertenezca al formulario", () => {
    expect(() => parseAIAction("update_subject", { id, xp: 999999 })).toThrow(/XP/);
    expect(() => parseAIAction("create_calendar_entry", { kind: "task", data: { title: "Trampa", rewards: { coins: 999 } } })).toThrow(/XP/);
  });

  it("rechaza cambios de sesiones que alterarian estadisticas y recompensas", () => {
    expect(() => parseAIAction("create_study_session", { startedAt: "2026-09-13T10:00:00.000Z", endedAt: "2026-09-13T10:30:00.000Z", plannedMinutes: 30, actualMinutes: 30 })).toThrow(/estadisticas/);
  });

  it("incluye propuestas para las entidades derivadas del calendario", () => {
    expect(parseAIAction("create_calendar_entry", {
      kind: "task",
      data: { title: "Repaso", planningMode: "FLEXIBLE_STUDY", type: "estudio", priority: "MEDIUM", difficulty: 3, dueDate: null, estimatedMinutes: 30 },
    })).toMatchObject({ entity: "calendario", action: "create_calendar_entry", arguments: { kind: "task", data: { title: "Repaso" } } });
  });

  it("no deja una propuesta de calendario que fallaria al confirmarla", () => {
    expect(() => parseAIAction("create_calendar_entry", { kind: "task", data: { title: "Repaso" } })).toThrow(AIActionContractError);
  });
});
