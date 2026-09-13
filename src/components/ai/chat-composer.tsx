"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ContextPicker } from "@/components/ai/context-picker";
import type { AISettingsValue, ContextOptions, ContextSelection } from "@/components/ai/types";

export function ChatComposer({ disabled, contextEnabled, usePersonalContext, permissions, maxItemsPerCategory, options, context, uploading = false, onContextChange, onPersonalContextChange, onUpload, onSend }: {
  disabled: boolean; contextEnabled: boolean; usePersonalContext: boolean; permissions: Pick<AISettingsValue, "canReadGrades" | "canReadTasksAndBosses" | "canReadSessionsAndStatistics" | "canReadSchedule" | "canReadMaterials" | "canReadGamification">; maxItemsPerCategory: number; options: ContextOptions; context: ContextSelection;
  uploading?: boolean; onContextChange: (value: ContextSelection) => void; onPersonalContextChange: (value: boolean) => void; onUpload?: (files: FileList) => void; onSend: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!value || disabled) return;
    setContent("");
    await onSend(value);
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
  }
  return <form onSubmit={submit} className="border-t bg-card p-3 sm:p-4"><div className="mx-auto max-w-3xl"><Textarea aria-label="Mensaje para la IA" placeholder="Pregunta sobre tu estudio…" value={content} maxLength={8000} rows={3} disabled={disabled} onChange={(event) => setContent(event.target.value)} onKeyDown={keyDown} className="min-h-20 resize-none" /><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><label className="inline-flex items-center gap-1.5 text-xs"><input type="checkbox" checked={usePersonalContext} disabled={disabled || !contextEnabled} onChange={(event) => onPersonalContextChange(event.target.checked)} />Contexto personal</label><ContextPicker enabled={contextEnabled && usePersonalContext && !disabled} permissions={permissions} maxItemsPerCategory={maxItemsPerCategory} options={options} value={context} uploading={uploading} onChange={onContextChange} onUpload={onUpload} /></div><div className="flex items-center gap-3"><span className="hidden text-[11px] text-muted-foreground sm:inline">Enter para enviar · Shift+Enter para salto</span><Button type="submit" size="icon" disabled={disabled || !content.trim()} aria-label="Enviar mensaje"><SendHorizontal className="size-4" /></Button></div></div></div></form>;
}
