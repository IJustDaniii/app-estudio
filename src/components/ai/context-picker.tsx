"use client";

import { BookMarked, ChevronDown, Image, Paperclip, Upload } from "lucide-react";
import type { ContextOption, ContextOptions, ContextSelection } from "@/components/ai/types";

const groups: Array<{ key: keyof ContextSelection; options: keyof ContextOptions; label: string }> = [
  { key: "subjectIds", options: "subjects", label: "Asignaturas" },
  { key: "taskIds", options: "tasks", label: "Tareas" },
  { key: "bossIds", options: "bosses", label: "Bosses" },
  { key: "gradeIds", options: "grades", label: "Notas" },
  { key: "goalIds", options: "goals", label: "Objetivos" },
  { key: "studySessionIds", options: "studySessions", label: "Sesiones de estudio" },
  { key: "materialIds", options: "materials", label: "Materiales" },
];

function OptionList({ options, selected, onToggle }: { options: ContextOption[]; selected: string[]; onToggle: (id: string) => void }) {
  if (!options.length) return <p className="px-1 py-2 text-xs text-muted-foreground">No hay elementos disponibles.</p>;
  return <div className="max-h-44 space-y-1 overflow-y-auto pr-1">{options.map((option) => <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"><input type="checkbox" className="mt-0.5" checked={selected.includes(option.id)} onChange={() => onToggle(option.id)} /><span className="min-w-0 flex-1 break-words">{option.mimeType?.startsWith("image/") && <Image className="mr-1 inline size-3" aria-label="Imagen" />}{option.label}</span></label>)}</div>;
}

export function ContextPicker({ enabled, options, value, uploading = false, onChange, onUpload }: { enabled: boolean; options: ContextOptions; value: ContextSelection; uploading?: boolean; onChange: (value: ContextSelection) => void; onUpload?: (files: FileList) => void }) {
  const total = Object.values(value).reduce((sum, ids) => sum + ids.length, 0);
  function toggle(key: keyof ContextSelection, id: string) {
    const current = value[key];
    const next = current.includes(id) ? current.filter((item) => item !== id) : current.length < 20 && total < 60 ? [...current, id] : current;
    onChange({ ...value, [key]: next });
  }
  return <details className="relative">
    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs font-medium aria-disabled:cursor-not-allowed aria-disabled:opacity-50" aria-disabled={!enabled} onClick={(event) => { if (!enabled) event.preventDefault(); }}><Paperclip className="size-4" />Contexto{total > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{total}</span>}<ChevronDown className="ml-auto size-3.5" /></summary>
    {enabled && <div className="fixed inset-x-3 bottom-24 z-40 grid max-h-[calc(100dvh-8rem)] gap-3 overflow-y-auto rounded-xl border bg-card p-4 shadow-lg sm:absolute sm:inset-x-auto sm:bottom-12 sm:left-0 sm:w-[min(44rem,calc(100vw-2.5rem))] sm:grid-cols-2 lg:grid-cols-3">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:col-span-2 lg:col-span-3"><div><p className="flex items-center gap-2 text-sm font-medium"><BookMarked className="size-4" />Selecciona sólo lo relevante</p><p className="mt-1 text-xs text-muted-foreground">Nada de la base de datos se añade automáticamente. La selección se aplica únicamente al siguiente mensaje.</p></div>{onUpload && <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-xs font-medium hover:bg-muted"><Upload className="pointer-events-none size-3.5" />{uploading ? "Subiendo…" : "Adjuntar archivo"}<input className="sr-only" type="file" multiple disabled={uploading} accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.gif,.webp" onChange={(event) => { if (event.target.files?.length) onUpload(event.target.files); event.target.value = ""; }} /></label>}</div>
      {groups.map((group) => <fieldset key={group.key} className="min-w-0"><legend className="mb-1 text-xs font-semibold">{group.label} <span className="font-normal text-muted-foreground">({value[group.key].length})</span></legend><OptionList options={options[group.options]} selected={value[group.key]} onToggle={(id) => toggle(group.key, id)} /></fieldset>)}
    </div>}
  </details>;
}
