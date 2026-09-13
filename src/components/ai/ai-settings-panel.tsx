"use client";

import { PlugZap, Settings2 } from "lucide-react";
import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AISettingsValue, ConnectionState } from "@/components/ai/types";

export function AISettingsPanel({ value, connection, busy, onChange, onSave, onTest }: {
  value: AISettingsValue; connection: ConnectionState; busy: boolean;
  onChange: (value: AISettingsValue) => void; onSave: () => Promise<void>; onTest: () => Promise<void>;
}) {
  async function submit(event: FormEvent) { event.preventDefault(); await onSave(); }
  return <details className="border-b bg-card">
    <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium"><Settings2 className="size-4" />Ajustes de IA<span className="ml-auto text-xs font-normal text-muted-foreground">{value.model}</span></summary>
    <form onSubmit={submit} className="grid gap-4 border-t p-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-1.5"><Label htmlFor="ollama-url">URL local de Ollama</Label><Input id="ollama-url" type="url" value={value.ollamaUrl} maxLength={200} required onChange={(event) => onChange({ ...value, ollamaUrl: event.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="ai-model">Modelo activo</Label><Input id="ai-model" value={value.model} maxLength={200} required onChange={(event) => onChange({ ...value, model: event.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="context-limit">Límite de contexto (caracteres)</Label><Input id="context-limit" type="number" min={1000} max={50000} step={500} value={value.contextLimit} onChange={(event) => onChange({ ...value, contextLimit: Number(event.target.value) })} /></div>
      <div className="flex flex-wrap items-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onTest}><PlugZap className="size-4" />Probar conexión</Button><Button type="submit" disabled={busy}>Guardar</Button></div>
      <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={value.isAcademicContextEnabled} onChange={(event) => onChange({ ...value, isAcademicContextEnabled: event.target.checked })} />Usar contexto académico seleccionado</label>
      <p className="text-xs text-muted-foreground md:col-span-2" role="status">{connection.message}</p>
    </form>
  </details>;
}
