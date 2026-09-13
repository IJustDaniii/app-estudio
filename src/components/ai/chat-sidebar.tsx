"use client";

import { Check, MessageSquarePlus, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatSummary } from "@/components/ai/types";

export function ChatSidebar({ chats, activeId, disabled, onCreate, onSelect, onRename, onDelete }: {
  chats: ChatSummary[]; activeId: string | null; disabled: boolean;
  onCreate: () => void; onSelect: (id: string) => void; onRename: (id: string, title: string) => void; onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  function startEditing(chat: ChatSummary) { setEditingId(chat.id); setTitle(chat.title); }
  function save() {
    if (editingId && title.trim()) onRename(editingId, title.trim());
    setEditingId(null);
  }
  return <aside className="flex min-h-0 flex-col border-b bg-muted/25 lg:border-b-0 lg:border-r" aria-label="Conversaciones de IA">
    <div className="flex items-center justify-between gap-3 border-b p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Conversaciones</p><Button type="button" size="sm" onClick={onCreate} disabled={disabled}><MessageSquarePlus className="size-4" />Nuevo</Button></div>
    <div className="flex max-h-44 gap-2 overflow-x-auto p-3 lg:max-h-none lg:flex-1 lg:flex-col lg:overflow-y-auto" role="list">
      {chats.map((chat) => <div key={chat.id} role="listitem" className={cn("group flex min-w-56 items-center gap-1 rounded-lg border bg-card p-1 lg:min-w-0", activeId === chat.id && "border-primary/40 bg-primary/5")}>
        {editingId === chat.id ? <><Input aria-label="Nuevo título del chat" value={title} maxLength={80} className="h-8" onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") setEditingId(null); }} autoFocus /><Button type="button" size="icon" variant="ghost" className="size-8" onClick={save} aria-label="Guardar título"><Check className="size-3.5" /></Button><Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => setEditingId(null)} aria-label="Cancelar edición"><X className="size-3.5" /></Button></> : <><button type="button" className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm" onClick={() => onSelect(chat.id)} aria-current={activeId === chat.id ? "true" : undefined}>{chat.title}</button><Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => startEditing(chat)} aria-label={`Renombrar ${chat.title}`}><Pencil className="size-3.5" /></Button><Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => onDelete(chat.id)} aria-label={`Eliminar ${chat.title}`}><Trash2 className="size-3.5" /></Button></>}
      </div>)}
      {!chats.length && <p className="p-3 text-sm text-muted-foreground">Aún no hay conversaciones.</p>}
    </div>
  </aside>;
}
