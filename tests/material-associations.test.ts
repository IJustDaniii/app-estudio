import { describe, expect, it } from "vitest";
import { materialMetadataUpdate } from "@/lib/materials/references";

describe("edicion de asociaciones de materiales", () => {
  it("conserva todas las asociaciones y el estado de examen al editar metadatos", () => {
    const values = { name: "Examen final", description: "Corregido", type: "EXAM" as const, subjectId: "subject-1", topicId: "topic-1", taskId: "task-1", bossId: "boss-1", isFavorite: true, isCompletedExam: true };
    expect(materialMetadataUpdate(values, values)).toEqual(values);
  });
});
