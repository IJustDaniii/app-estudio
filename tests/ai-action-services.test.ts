import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseAIAction } from "@/lib/ai/action-contract";

const ensureReferences = vi.hoisted(() => vi.fn());
const ensureSubjectChange = vi.hoisted(() => vi.fn());
const ensureTimetableSubjectChange = vi.hoisted(() => vi.fn());
const deleteWithCompensation = vi.hoisted(() => vi.fn());
const storageProvider = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/domain/timetable-rules", () => ({ ensureTimetableEntrySubjectChangeAllowed: ensureTimetableSubjectChange }));
vi.mock("@/lib/materials/references", () => ({ ensureOwnedMaterialReferences: ensureReferences, ensureAcademicEntitySubjectChangeAllowed: ensureSubjectChange }));
vi.mock("@/lib/materials/service", () => ({ deleteMaterialWithCompensation: deleteWithCompensation }));
vi.mock("@/lib/materials/storage", () => ({ getStorageProvider: storageProvider }));

const { executeAIAction } = await import("@/lib/ai/action-services");

const id = "cm0000000000000000000000";

describe("servicios de acciones de IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureReferences.mockImplementation(async (_userId: string, values: unknown) => values);
    ensureTimetableSubjectChange.mockResolvedValue(undefined);
    deleteWithCompensation.mockImplementation(async (_storage: unknown, _key: string, removeMetadata: () => Promise<void>) => removeMetadata());
    storageProvider.mockReturnValue({});
  });

  it("crea una entidad con el usuario autenticado y valida referencias", async () => {
    const subjectCreate = vi.fn().mockResolvedValue({ id, name: "Fisica" });
    const db = { subject: { create: subjectCreate } };
    const result = await executeAIAction(db as never, "user-a", parseAIAction("create_subject", { name: "Fisica", color: "blue" }));

    expect(result).toEqual({ id, name: "Fisica" });
    expect(subjectCreate).toHaveBeenCalledWith(expect.objectContaining({ data: { name: "Fisica", color: "blue", userId: "user-a" } }));
  });

  it("no permite usar una asignatura de otra cuenta al crear una tarea", async () => {
    const subjectFindFirst = vi.fn().mockResolvedValue(null);
    const taskCreate = vi.fn();
    const db = { subject: { findFirst: subjectFindFirst }, task: { create: taskCreate } };

    await expect(executeAIAction(db as never, "user-a", parseAIAction("create_task", {
      title: "Repaso", planningMode: "FLEXIBLE_STUDY", type: "estudio", priority: "MEDIUM", difficulty: 3,
      dueDate: null, estimatedMinutes: 30, subjectId: id,
    }))).rejects.toThrow("AI_ACTION_NOT_FOUND");
    expect(subjectFindFirst).toHaveBeenCalledWith({ where: { id, userId: "user-a" }, select: { id: true } });
    expect(taskCreate).not.toHaveBeenCalled();
  });

  it("actualiza metadatos con referencias del mismo usuario", async () => {
    const materialFindFirst = vi.fn().mockResolvedValue({ id, name: "Apuntes", description: null, type: "NOTES", subjectId: null, topicId: null, taskId: null, bossId: null, isFavorite: false, isCompletedExam: false });
    const materialUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = { material: { findFirst: materialFindFirst, updateMany: materialUpdateMany } };

    await executeAIAction(db as never, "user-a", parseAIAction("update_material_metadata", { id, name: "Apuntes nuevos", type: "THEORY", isFavorite: true }));

    expect(ensureReferences).toHaveBeenCalledWith("user-a", expect.objectContaining({ subjectId: null, isCompletedExam: false }), db);
    expect(materialUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id, userId: "user-a" }, data: expect.objectContaining({ name: "Apuntes nuevos", type: "THEORY", isFavorite: true }) }));
  });

  it("borra metadatos y archivo mediante la compensacion existente", async () => {
    const materialFindFirst = vi.fn().mockResolvedValue({ id, storageKey: "materials/user-a/file" });
    const materialDelete = vi.fn().mockResolvedValue({});
    const db = { material: { findFirst: materialFindFirst, delete: materialDelete } };
    const storage = { get: vi.fn(), exists: vi.fn(), delete: vi.fn(), put: vi.fn() };
    storageProvider.mockReturnValue(storage);

    await executeAIAction(db as never, "user-a", parseAIAction("delete_material_metadata", { id }));

    expect(deleteWithCompensation).toHaveBeenCalledWith(storage, "materials/user-a/file", expect.any(Function));
    expect(materialDelete).toHaveBeenCalledWith({ where: { id } });
  });

  it("aplica la protección de cambios puntuales también a una propuesta de horario", async () => {
    const timetableFindFirst = vi.fn().mockResolvedValue({ id, subjectId: "subject-a" });
    const subjectFindFirst = vi.fn().mockResolvedValue({ id });
    const timetableUpdateMany = vi.fn();
    ensureTimetableSubjectChange.mockRejectedValue(new Error("TIMETABLE_ENTRY_SUBJECT_CHANGE_BLOCKED"));
    const db = { timetableEntry: { findFirst: timetableFindFirst, updateMany: timetableUpdateMany }, subject: { findFirst: subjectFindFirst } };

    await expect(executeAIAction(db as never, "user-a", parseAIAction("update_timetable", { id, subjectId: id }))).rejects.toThrow("TIMETABLE_ENTRY_SUBJECT_CHANGE_BLOCKED");
    expect(ensureTimetableSubjectChange).toHaveBeenCalledWith(db, "user-a", id, "subject-a", id);
    expect(timetableUpdateMany).not.toHaveBeenCalled();
  });
});
