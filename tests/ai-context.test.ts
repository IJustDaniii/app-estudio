import { describe, expect, it } from "vitest";
import { buildAcademicContext, type AcademicContextRepository } from "@/lib/ai/context";
import { emptyContextSelection } from "@/lib/ai/validation";

function repository(): AcademicContextRepository {
  return {
    async subjects(userId, ids) {
      return ids.map((id) => ({ id, name: `${userId}-Asignatura-${id}` }));
    },
    async tasks(userId, ids) {
      return ids.map((id) => ({ id, title: `${userId}-Tarea-${id}`, status: "PENDING", dueDate: null, priority: "MEDIUM", notes: null, subjectName: null }));
    },
    async bosses(userId, ids) {
      return ids.map((id) => ({ id, title: `${userId}-Boss-${id}`, date: new Date("2026-10-01T10:00:00Z"), topics: ["Tema 1"], preparation: 20, subjectName: "Matemáticas" }));
    },
    async grades(userId, ids) {
      return ids.map((id) => ({ id, label: `${userId}-Nota-${id}`, value: 8.5, date: new Date("2026-09-01T00:00:00Z"), subjectName: "Lengua" }));
    },
    async goals(userId, ids) {
      return ids.map((id) => ({ id, title: `${userId}-Objetivo-${id}`, progress: 40, targetDate: null, isComplete: false }));
    },
    async studySessions(userId, ids) {
      return ids.map((id) => ({ id, startedAt: new Date("2026-09-12T17:00:00Z"), actualMinutes: 25, subjectName: `${userId}-Física`, taskTitle: null }));
    },
    async materials() { return []; },
  };
}

describe("buildAcademicContext", () => {
  it("includes only explicitly selected records", async () => {
    const result = await buildAcademicContext({
      userId: "user-1",
      isEnabled: true,
      maxCharacters: 4_000,
      selection: { ...emptyContextSelection, subjectIds: ["subject-1"], taskIds: ["task-1"] },
      repository: repository(),
      loadMaterial: async () => Buffer.alloc(0),
    });

    expect(result.text).toContain("user-1-Asignatura-subject-1");
    expect(result.text).toContain("user-1-Tarea-task-1");
    expect(result.text).not.toContain("subject-2");
    expect(result.snapshot.included).toEqual([
      { type: "subject", id: "subject-1", label: "user-1-Asignatura-subject-1" },
      { type: "task", id: "task-1", label: "user-1-Tarea-task-1" },
    ]);
  });

  it("returns no academic data when context is disabled", async () => {
    const result = await buildAcademicContext({
      userId: "user-1",
      isEnabled: false,
      maxCharacters: 4_000,
      selection: { ...emptyContextSelection, subjectIds: ["subject-1"] },
      repository: repository(),
      loadMaterial: async () => Buffer.alloc(0),
    });

    expect(result).toMatchObject({ text: "", images: [], snapshot: { included: [], omitted: [] } });
  });

  it("never exceeds the configured character limit", async () => {
    const result = await buildAcademicContext({
      userId: "user-1",
      isEnabled: true,
      maxCharacters: 120,
      selection: { ...emptyContextSelection, subjectIds: ["a", "b", "c"] },
      repository: repository(),
      loadMaterial: async () => Buffer.alloc(0),
    });

    expect(result.text.length).toBeLessThanOrEqual(120);
    expect(result.snapshot.omitted.length).toBeGreaterThan(0);
  });
});
