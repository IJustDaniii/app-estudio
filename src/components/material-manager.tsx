"use client";

import { ChangeEvent, DragEvent, FormEvent, useMemo, useState } from "react";
import { Download, FileText, Heart, ImageIcon, Pencil, Star, Trash2, Upload } from "lucide-react";
import { MATERIAL_TYPE_LABELS, MATERIAL_TYPES, isPreviewableMimeType, type MaterialTypeValue } from "@/lib/materials/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Option = { id: string; label: string; subjectId?: string | null };
type MaterialItem = {
  id: string; name: string; originalName: string; mimeType: string; size: number; type: MaterialTypeValue;
  description: string | null; isFavorite: boolean; isCompletedExam: boolean; subjectId: string | null; topicId: string | null;
  taskId: string | null; bossId: string | null; uploadedAt: string; subject: { name: string } | null; topic: { name: string } | null;
  task: { title: string } | null; boss: { title: string } | null;
};

type Props = { materials: MaterialItem[]; subjects: Option[]; topics: Option[]; tasks: Option[]; bosses: Option[]; initialMetadata?: typeof emptyMetadata };

const emptyMetadata: { subjectId: string; topicId: string; taskId: string; bossId: string; type: MaterialTypeValue; isFavorite: boolean; isCompletedExam: boolean } = { subjectId: "", topicId: "", taskId: "", bossId: "", type: "OTHER", isFavorite: false, isCompletedExam: false };

function bytes(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function associationLabel(material: MaterialItem) {
  return [material.subject?.name, material.topic?.name, material.task?.title, material.boss?.title].filter(Boolean).join(" · ") || "Sin relación";
}

function MaterialFields({ subjects, topics, tasks, bosses, values = emptyMetadata, prefix = "new" }: Omit<Props, "materials"> & { values?: typeof emptyMetadata; prefix?: string }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <div><Label htmlFor={`${prefix}-material-subject`}>Asignatura</Label><Select id={`${prefix}-material-subject`} name="subjectId" defaultValue={values.subjectId}><option value="">Sin asignatura</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
    <div><Label htmlFor={`${prefix}-material-topic`}>Tema / unidad</Label><Select id={`${prefix}-material-topic`} name="topicId" defaultValue={values.topicId}><option value="">Sin tema</option>{topics.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
    <div><Label htmlFor={`${prefix}-material-type`}>Tipo</Label><Select id={`${prefix}-material-type`} name="type" defaultValue={values.type}>{MATERIAL_TYPES.map((type) => <option key={type} value={type}>{MATERIAL_TYPE_LABELS[type]}</option>)}</Select></div>
    <div><Label htmlFor={`${prefix}-material-task`}>Tarea</Label><Select id={`${prefix}-material-task`} name="taskId" defaultValue={values.taskId}><option value="">Sin tarea</option>{tasks.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
    <div><Label htmlFor={`${prefix}-material-boss`}>Boss</Label><Select id={`${prefix}-material-boss`} name="bossId" defaultValue={values.bossId}><option value="">Sin Boss</option>{bosses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
    <div className="flex flex-wrap items-end gap-4 pb-1 text-sm"><Label className="flex items-center gap-2"><input name="isFavorite" type="checkbox" defaultChecked={values.isFavorite} /> Favorito</Label><Label className="flex items-center gap-2"><input name="isCompletedExam" type="checkbox" defaultChecked={values.isCompletedExam} /> Examen realizado</Label></div>
  </div>;
}

export function MaterialManager({ materials, subjects, topics, tasks, bosses, initialMetadata = emptyMetadata }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [sort, setSort] = useState("date");

  const visibleMaterials = useMemo(() => materials.filter((material) => {
    return material.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
      && (!subjectFilter || material.subjectId === subjectFilter)
      && (!typeFilter || material.type === typeFilter)
      && (!favorites || material.isFavorite);
  }).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "size" ? b.size - a.size : new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()), [materials, favorites, query, sort, subjectFilter, typeFilter]);

  function addFiles(next: FileList | File[]) {
    setFiles((current) => [...current, ...Array.from(next)]);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) return setMessage("Selecciona uno o varios archivos.");
    const data = new FormData(event.currentTarget);
    files.forEach((file) => data.append("files", file));
    setMessage("Subiendo materiales…");
    const response = await fetch("/api/materials", { method: "POST", body: data });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "No se pudo subir el material.");
    setFiles([]);
    event.currentTarget.reset();
    setMessage(`${result.created.length} añadido(s)${result.duplicates.length ? ` · ${result.duplicates.join(", ")} ya existía(n)` : ""}.`);
    window.location.reload();
  }

  async function update(id: string, values: Record<string, FormDataEntryValue | boolean>) {
    const response = await fetch(`/api/materials/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (!response.ok) return setMessage("No se pudo actualizar el material.");
    window.location.reload();
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await update(id, values);
  }

  async function remove(id: string) {
    if (!window.confirm("¿Eliminar este material? Esta acción no se puede deshacer.")) return;
    const response = await fetch(`/api/materials/${id}`, { method: "DELETE" });
    if (!response.ok) return setMessage("No se pudo eliminar el material.");
    window.location.reload();
  }

  return <div className="space-y-6">
    <form onSubmit={upload} className="rounded-xl border bg-card p-4 sm:p-5">
      <div onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); addFiles(event.dataTransfer.files); }} onDragOver={(event) => event.preventDefault()} className="grid gap-3 rounded-lg border border-dashed bg-muted/40 p-6 text-center">
        <Upload className="mx-auto size-6 text-muted-foreground" /><p className="text-sm font-medium">Arrastra aquí tus archivos</p><p className="text-xs text-muted-foreground">PDF, imágenes, Word o PowerPoint · máximo 50 MB por archivo</p>
        <Label htmlFor="material-files" className="mx-auto cursor-pointer text-sm font-medium text-primary underline underline-offset-4">Elegir archivos</Label><Input id="material-files" className="sr-only" type="file" name="files" multiple accept="application/pdf,image/jpeg,image/png,image/gif,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && addFiles(event.target.files)} />
        {files.length > 0 && <p className="text-xs text-muted-foreground">{files.map((file) => file.name).join(" · ")}</p>}
      </div>
      <div className="mt-4"><MaterialFields subjects={subjects} topics={topics} tasks={tasks} bosses={bosses} values={initialMetadata} /></div>
      <div className="mt-4 flex items-center gap-3"><Button type="submit">Subir materiales</Button>{message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}</div>
    </form>

    <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"><div><Label htmlFor="material-search">Buscar</Label><Input id="material-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre" /></div><div><Label htmlFor="filter-subject">Asignatura</Label><Select id="filter-subject" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option value="">Todas</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div><div><Label htmlFor="filter-type">Tipo</Label><Select id="filter-type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">Todos</option>{MATERIAL_TYPES.map((type) => <option key={type} value={type}>{MATERIAL_TYPE_LABELS[type]}</option>)}</Select></div><div><Label htmlFor="material-sort">Ordenar</Label><Select id="material-sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="date">Fecha</option><option value="name">Nombre</option><option value="size">Tamaño</option></Select></div><Label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={favorites} onChange={(event) => setFavorites(event.target.checked)} /> Solo favoritos</Label></div>

    {visibleMaterials.length ? <ul className="space-y-3">{visibleMaterials.map((material) => {
      const values = { subjectId: material.subjectId ?? "", topicId: material.topicId ?? "", taskId: material.taskId ?? "", bossId: material.bossId ?? "", type: material.type, isFavorite: material.isFavorite, isCompletedExam: material.isCompletedExam };
      const baseValues = { ...values, name: material.name, description: material.description ?? "" };
      return <li key={material.id} className="rounded-xl border bg-card p-4"><div className="flex flex-wrap items-start gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">{material.mimeType.startsWith("image/") ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium">{material.name}</p>{material.isFavorite && <Star className="size-4 fill-amber-400 text-amber-400" aria-label="Favorito" />}{material.isCompletedExam && <span className="text-xs font-medium text-primary">Examen realizado</span>}</div><p className="mt-1 truncate text-xs text-muted-foreground">{material.originalName} · {bytes(material.size)} · {MATERIAL_TYPE_LABELS[material.type]}</p><p className="mt-1 text-xs text-muted-foreground">{associationLabel(material)}</p></div><div className="flex gap-1"><Button asChild variant="ghost" size="icon"><a href={`/api/materials/${material.id}`} aria-label={`Descargar ${material.name}`}><Download className="size-4" /></a></Button><Button type="button" variant="ghost" size="icon" aria-label={`Marcar ${material.name} como favorito`} onClick={() => update(material.id, { ...baseValues, isFavorite: !material.isFavorite })}><Heart className={material.isFavorite ? "size-4 fill-current" : "size-4"} /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${material.name}`} onClick={() => remove(material.id)}><Trash2 className="size-4" /></Button></div></div>
        {isPreviewableMimeType(material.mimeType) && <details className="mt-3"><summary className="cursor-pointer text-sm text-primary">Vista previa</summary><object className="mt-3 h-80 w-full rounded-lg border bg-muted" data={`/api/materials/${material.id}?preview=1`} type={material.mimeType}><a className="text-sm text-primary" href={`/api/materials/${material.id}`}>Descargar archivo</a></object></details>}
        <details className="mt-3"><summary className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><Pencil className="size-3.5" /> Editar</summary><form onSubmit={(event) => submitEdit(event, material.id)} className="mt-3 space-y-3"><div><Label htmlFor={`material-name-${material.id}`}>Nombre</Label><Input id={`material-name-${material.id}`} name="name" defaultValue={material.name} maxLength={160} required /></div><div><Label htmlFor={`material-description-${material.id}`}>Descripción</Label><Textarea id={`material-description-${material.id}`} name="description" defaultValue={material.description ?? ""} maxLength={2000} /></div><MaterialFields subjects={subjects} topics={topics} tasks={tasks} bosses={bosses} values={values} prefix={material.id} /><Button type="submit">Guardar cambios</Button></form></details>
      </li>;
    })}</ul> : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No hay materiales que coincidan con los filtros.</p>}
  </div>;
}
