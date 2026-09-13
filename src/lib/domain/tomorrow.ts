export type TomorrowMaterial = { id: string; name: string; taskId: string | null; subjectId: string | null; bossId: string | null };

export function selectTomorrowMaterials(taskIds: string[], subjectIds: string[], bossIds: string[], materials: TomorrowMaterial[]) {
  const taskSet = new Set(taskIds);
  const subjectSet = new Set(subjectIds);
  const bossSet = new Set(bossIds);
  return materials.filter((material) => (material.taskId !== null && taskSet.has(material.taskId)) || (material.subjectId !== null && subjectSet.has(material.subjectId)) || (material.bossId !== null && bossSet.has(material.bossId)));
}
