import { describe, expect, it } from "vitest";
import { toolDefinitionsForPermissions } from "@/lib/ai/tools";
import { aiSettingsSchema, emptyContextSelection, effectiveContextSelection } from "@/lib/ai/validation";

const settingsBase = {
  ollamaUrl: "http://127.0.0.1:11434",
  model: "qwen3.5:9b",
  isAcademicContextEnabled: true,
  contextLimit: 12_000,
};

describe("permisos de contexto de IA", () => {
  it("mantiene compatibilidad con ajustes antiguos y activa permisos por defecto", () => {
    expect(aiSettingsSchema.parse(settingsBase)).toMatchObject({
      isAIEnabled: true,
      canReadGrades: true,
      canReadTasksAndBosses: true,
      canReadSessionsAndStatistics: true,
      canReadSchedule: true,
      canReadMaterials: true,
      canReadGamification: true,
      maxItemsPerCategory: 20,
    });
  });

  it("no publica herramientas de categorías revocadas", () => {
    const definitions = toolDefinitionsForPermissions({
      canReadGrades: false,
      canReadTasksAndBosses: true,
      canReadSessionsAndStatistics: false,
      canReadSchedule: true,
      canReadMaterials: false,
      canReadGamification: false,
    });
    const names = definitions.map((tool) => tool.name);
    expect(names).toContain("consult_tasks");
    expect(names).toContain("consult_schedule");
    expect(names).not.toContain("consult_grades");
    expect(names).not.toContain("consult_statistics");
    expect(names).not.toContain("consult_materials");
    expect(names).not.toContain("consult_gamification");
  });

  it("filtra la selección manual al desactivar permisos y deduplica IDs", () => {
    const selection = {
      ...emptyContextSelection,
      gradeIds: ["cm0000000000000000000000", "cm0000000000000000000000"],
      taskIds: ["cm0000000000000000000001"],
      materialIds: ["cm0000000000000000000002"],
    };
    expect(effectiveContextSelection(true, selection, {
      canReadGrades: false,
      canReadTasksAndBosses: true,
      canReadSessionsAndStatistics: true,
      canReadSchedule: true,
      canReadMaterials: false,
      canReadGamification: true,
    }, 1)).toEqual({
      ...emptyContextSelection,
      taskIds: ["cm0000000000000000000001"],
    });
  });
});
