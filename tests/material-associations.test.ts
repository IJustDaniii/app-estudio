import { describe, expect, it, vi } from "vitest";
import { ensureAcademicEntitySubjectChangeAllowed, ensureOwnedMaterialReferences, materialMetadataUpdate } from "@/lib/materials/references";

describe("edicion de asociaciones de materiales", () => {
  it("conserva todas las asociaciones y el estado de examen al editar metadatos", () => {
    const values = { name: "Examen final", description: "Corregido", type: "EXAM" as const, subjectId: "subject-1", topicId: "topic-1", taskId: "task-1", bossId: "boss-1", isFavorite: true, isCompletedExam: true };
    expect(materialMetadataUpdate(values, values)).toEqual(values);
  });
  it("bloquea mover una tarea de asignatura cuando tiene materiales", async () => {
    const count = vi.fn().mockResolvedValue(1);
    const database = { material: { count } } as never;

    await expect(ensureAcademicEntitySubjectChangeAllowed("user-a", "taskId", "task-1", "subject-1", "subject-2", database)).rejects.toThrow("MATERIALS_SUBJECT_CHANGE_BLOCKED");
    expect(count).toHaveBeenCalledWith({ where: { userId: "user-a", taskId: "task-1" } });
  });

  it.each([
    ["topicId", "topic-1"],
    ["bossId", "boss-1"],
  ] as const)("aplica el mismo bloqueo al mover un %s con materiales", async (field, entityId) => {
    const count = vi.fn().mockResolvedValue(1);
    const database = { material: { count } } as never;

    await expect(ensureAcademicEntitySubjectChangeAllowed("user-a", field, entityId, "subject-1", "subject-2", database)).rejects.toThrow("MATERIALS_SUBJECT_CHANGE_BLOCKED");
    expect(count).toHaveBeenCalledWith({ where: { userId: "user-a", [field]: entityId } });
  });

  it("permite mover una tarea sin materiales y consulta solo datos de la cuenta", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const database = { material: { count } } as never;

    await expect(ensureAcademicEntitySubjectChangeAllowed("user-a", "taskId", "task-1", "subject-1", "subject-2", database)).resolves.toBeUndefined();
    expect(count).toHaveBeenCalledWith({ where: { userId: "user-a", taskId: "task-1" } });
  });

  it("no consulta materiales si la asignatura no cambia", async () => {
    const count = vi.fn();
    const database = { material: { count } } as never;

    await ensureAcademicEntitySubjectChangeAllowed("user-a", "bossId", "boss-1", "subject-1", "subject-1", database);
    expect(count).not.toHaveBeenCalled();
  });

  it("rechaza una referencia que pertenece a otra cuenta", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const database = {
      subject: { findFirst },
      topic: { findFirst },
      task: { findFirst },
      boss: { findFirst },
    } as never;

    await expect(ensureOwnedMaterialReferences("user-a", { subjectId: "subject-b", topicId: null, taskId: null, bossId: null, isCompletedExam: false }, database)).rejects.toThrow("INVALID_MATERIAL_REFERENCE");
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "subject-b", userId: "user-a" }, select: { id: true } });
  });
});
