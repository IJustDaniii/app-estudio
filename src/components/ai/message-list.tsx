"use client";

import { Bot, CircleAlert, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/components/ai/types";

export function MessageList({ messages, isLoading }: { messages: ChatMessage[]; isLoading: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);
  if (isLoading) return <div className="grid flex-1 place-items-center p-8 text-sm text-muted-foreground" aria-busy="true">Cargando conversación…</div>;
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8" aria-live="polite">
    {!messages.length ? <div className="mx-auto grid max-w-md place-items-center py-16 text-center"><span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Bot className="size-6" /></span><h2 className="mt-4 text-lg font-semibold">Tu espacio de IA académica</h2><p className="mt-2 text-sm text-muted-foreground">Escribe una pregunta y, si lo necesitas, selecciona asignaturas, tareas o materiales concretos como contexto.</p></div> : <ol className="mx-auto max-w-3xl space-y-6">{messages.map((message) => <li key={message.id} className="flex items-start gap-3"><span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${message.role === "USER" ? "bg-muted" : "bg-primary/10 text-primary"}`}>{message.role === "USER" ? <UserRound className="size-4" /> : <Bot className="size-4" />}</span><div className="min-w-0 flex-1"><p className="mb-1 text-xs font-semibold text-muted-foreground">{message.role === "USER" ? "Tú" : message.model ?? "Aula IA"}</p><div className="whitespace-pre-wrap break-words text-sm leading-6">{message.content || (message.status === "PENDING" ? <span className="text-muted-foreground">Pensando…</span> : null)}</div>{message.status === "ERROR" && <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive"><CircleAlert className="size-3.5" />La respuesta se interrumpió. Comprueba Ollama y vuelve a intentarlo.</p>}</div></li>)}</ol>}
    <div ref={endRef} />
  </div>;
}
