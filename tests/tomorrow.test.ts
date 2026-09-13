import { describe, expect, it } from "vitest";
import { selectTomorrowMaterials } from "@/lib/domain/tomorrow";

describe("vista de mañana", () => {
  it("selecciona materiales de las tareas, clases y Bosses del día", () => {
    const materials = selectTomorrowMaterials(["task-1"], ["subject-1"], ["boss-1"], [
      { id: "material-task", name: "Ejercicios", taskId: "task-1", subjectId: null, bossId: null },
      { id: "material-subject", name: "Apuntes", taskId: null, subjectId: "subject-1", bossId: null },
      { id: "material-boss", name: "Examen anterior", taskId: null, subjectId: null, bossId: "boss-1" },
      { id: "material-other", name: "Otro", taskId: null, subjectId: "subject-9", bossId: null },
    ]);
    expect(materials.map((material) => material.id)).toEqual(["material-task", "material-subject", "material-boss"]);
  });
});
