"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { SendHorizontal, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatComposer({ disabled, contextEnabled, usePersonalContext, allowInternet, uploading = false, onPersonalContextChange, onAllowInternetChange, onUpload, onSend }: {
  disabled: boolean;
  contextEnabled: boolean;
  usePersonalContext: boolean;
  allowInternet: boolean;
  uploading?: boolean;
  onPersonalContextChange: (value: boolean) => void;
  onAllowInternetChange: (value: boolean) => void;
  onUpload?: (files: FileList) => void;
  onSend: (content: string) => Promise<void>;
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
  return <form onSubmit={submit} className="border-t bg-card p-3 sm:p-4"><div className="mx-auto max-w-3xl"><Textarea aria-label="Mensaje para la IA" placeholder="Pregunta sobre tu estudio..." value={content} maxLength={8000} rows={3} disabled={disabled} onChange={(event) => setContent(event.target.value)} onKeyDown={keyDown} className="min-h-20 resize-none" /><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-3"><label className="inline-flex items-center gap-1.5 text-xs"><input type="checkbox" checked={usePersonalContext} disabled={disabled || !contextEnabled} onChange={(event) => onPersonalContextChange(event.target.checked)} />Usar mi contexto autorizado</label><label className="inline-flex items-center gap-1.5 text-xs"><input type="checkbox" checked={allowInternet} disabled={disabled} onChange={(event) => onAllowInternetChange(event.target.checked)} />Permitir busqueda web en este mensaje</label>{onUpload && <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium"><Upload className="size-3.5" />{uploading ? "Subiendo..." : "Subir material"}<input className="sr-only" type="file" multiple disabled={uploading} accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.gif,.webp" onChange={(event) => { if (event.target.files?.length) onUpload(event.target.files); event.target.value = ""; }} /></label>}<span className="text-[11px] text-muted-foreground">El contexto se selecciona automaticamente segun la pregunta.</span></div><div className="flex items-center gap-3"><span className="hidden text-[11px] text-muted-foreground sm:inline">Enter para enviar - Shift+Enter para salto</span><Button type="submit" size="icon" disabled={disabled || !content.trim()} aria-label="Enviar mensaje"><SendHorizontal className="size-4" /></Button></div></div></div></form>;
}
