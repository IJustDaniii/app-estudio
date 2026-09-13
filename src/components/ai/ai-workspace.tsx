"use client";

import { Bot, CircleAlert, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AISettingsPanel } from "@/components/ai/ai-settings-panel";
import { ChatComposer } from "@/components/ai/chat-composer";
import { ChatSidebar } from "@/components/ai/chat-sidebar";
import { MessageList } from "@/components/ai/message-list";
import type { AISettingsValue, ChatMessage, ChatSummary, ConnectionState, ContextOptions, ContextSelection, Pagination } from "@/components/ai/types";
import { Button } from "@/components/ui/button";
import { effectiveContextSelection, emptyContextSelection } from "@/lib/ai/validation";

type StreamEvent =
  | { type: "meta"; chat?: ChatSummary; userMessage: ChatMessage; assistantMessage: ChatMessage; warnings: string[] }
  | { type: "delta"; content: string }
  | { type: "warning"; warnings: string[] }
  | { type: "done"; message: ChatMessage; warnings: string[] }
  | { type: "error"; error: { code: string; message: string }; partialContent: string };

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return body?.error?.message ?? "La operación no se pudo completar.";
}

async function connectionFor(settings: AISettingsValue): Promise<ConnectionState> {
  if (!settings.isAIEnabled) return { status: "offline", message: "La IA está desactivada en tus ajustes." };
  try {
    const response = await fetch("/api/ai/settings/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ollamaUrl: settings.ollamaUrl, model: settings.model }) });
    if (!response.ok) return { status: "offline", message: await errorMessage(response) };
    const result = await response.json() as { isModelAvailable: boolean; capabilities: { vision: boolean } };
    return result.isModelAvailable
      ? { status: "online", message: `Ollama conectado · ${settings.model}${result.capabilities.vision ? " · imágenes disponibles" : ""}`, isModelAvailable: true, supportsVision: result.capabilities.vision }
      : { status: "offline", message: `Ollama responde, pero el modelo ${settings.model} no está instalado.`, isModelAvailable: false };
  } catch {
    return { status: "offline", message: "No se pudo contactar con el backend de IA." };
  }
}

function emptyContextOptions(): ContextOptions {
  return { subjects: [], topics: [], tasks: [], bosses: [], grades: [], goals: [], studySessions: [], materials: [] };
}

export function AIWorkspace({ initialChats, initialChatPagination, initialActiveId, initialMessages, initialMessagePagination, initialSettings, contextOptions }: {
  initialChats: ChatSummary[]; initialChatPagination: Pagination; initialActiveId: string | null; initialMessages: ChatMessage[]; initialMessagePagination: Pagination; initialSettings: AISettingsValue; contextOptions: ContextOptions;
}) {
  const [chats, setChats] = useState(initialChats);
  const [activeId, setActiveId] = useState(initialActiveId);
  const [messages, setMessages] = useState(initialMessages);
  const [chatPagination, setChatPagination] = useState(initialChatPagination);
  const [messagePagination, setMessagePagination] = useState(initialMessagePagination);
  const [settings, setSettings] = useState(initialSettings);
  const [availableOptions, setAvailableOptions] = useState(contextOptions);
  const [selection, setSelection] = useState<ContextSelection>(emptyContextSelection);
  const [usePersonalContext, setUsePersonalContext] = useState(true);
  const [connection, setConnection] = useState<ConnectionState>({ status: "checking", message: "Comprobando Ollama…" });
  const [busy, setBusy] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingMoreChats, setLoadingMoreChats] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const checkedInitialConnection = useRef(false);
  const contextOptionsRequest = useRef(0);
  const sending = useRef(false);

  useEffect(() => {
    if (checkedInitialConnection.current) return;
    checkedInitialConnection.current = true;
    void connectionFor(initialSettings).then(setConnection);
  }, [initialSettings]);

  function createChat() {
    // "Nuevo" sólo prepara la vista: no deja conversaciones vacías en la base.
    setActiveId(null); setMessages([]); setMessagePagination({ page: 1, pageSize: 50, totalItems: 0, totalPages: 0, hasPrevious: false, hasNext: false }); setSelection(emptyContextSelection); setUsePersonalContext(true); setNotice("");
    window.history.replaceState(null, "", "/app/ai");
  }

  async function selectChat(id: string) {
    if (id === activeId) return;
    setLoadingChat(true); setNotice("");
    try {
      const response = await fetch(`/api/ai/chats/${id}`);
      if (!response.ok) throw new Error(await errorMessage(response));
      const chat = await response.json() as ChatSummary & { messages: ChatMessage[]; messagesPagination: Pagination };
      setActiveId(id); setMessages(chat.messages); setMessagePagination(chat.messagesPagination); setSelection(emptyContextSelection); setUsePersonalContext(true);
      window.history.replaceState(null, "", `/app/ai?chat=${id}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo cargar el chat."); }
    finally { setLoadingChat(false); }
  }

  async function loadMoreChats() {
    if (!chatPagination.hasNext || loadingMoreChats) return;
    setLoadingMoreChats(true);
    try {
      const response = await fetch(`/api/ai/chats?page=${chatPagination.page + 1}&pageSize=${chatPagination.pageSize}`);
      if (!response.ok) throw new Error(await errorMessage(response));
      const result = await response.json() as { data: ChatSummary[]; pagination: Pagination };
      setChats((current) => [...current, ...result.data.filter((chat) => !current.some((item) => item.id === chat.id))]);
      setChatPagination(result.pagination);
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudieron cargar más conversaciones."); }
    finally { setLoadingMoreChats(false); }
  }

  async function loadOlderMessages() {
    if (!activeId || !messagePagination.hasNext || loadingOlderMessages) return;
    setLoadingOlderMessages(true);
    try {
      const response = await fetch(`/api/ai/chats/${activeId}?messagePage=${messagePagination.page + 1}&messagePageSize=${messagePagination.pageSize}`);
      if (!response.ok) throw new Error(await errorMessage(response));
      const result = await response.json() as { messages: ChatMessage[]; messagesPagination: Pagination };
      setMessages((current) => [...result.messages, ...current]);
      setMessagePagination(result.messagesPagination);
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudieron cargar mensajes anteriores."); }
    finally { setLoadingOlderMessages(false); }
  }

  async function renameChat(id: string, title: string) {
    const response = await fetch(`/api/ai/chats/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    if (!response.ok) return setNotice(await errorMessage(response));
    const updated = await response.json() as ChatSummary;
    setChats((current) => current.map((chat) => chat.id === id ? updated : chat));
  }

  async function deleteChat(id: string) {
    if (!window.confirm("¿Eliminar esta conversación y todos sus mensajes?")) return;
    const response = await fetch(`/api/ai/chats/${id}`, { method: "DELETE" });
    if (!response.ok) return setNotice(await errorMessage(response));
    const remaining = chats.filter((chat) => chat.id !== id);
    setChats(remaining);
    if (activeId === id) {
      const next = remaining[0]; setActiveId(next?.id ?? null); setMessages([]);
      window.history.replaceState(null, "", next ? `/app/ai?chat=${next.id}` : "/app/ai");
      if (next) void selectChat(next.id);
    }
  }

  async function saveSettings() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/ai/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      if (!response.ok) { setNotice(await errorMessage(response)); return; }
      const saved = await response.json() as AISettingsValue;
      setSettings(saved);
      setSelection(effectiveContextSelection(saved.isAIEnabled && saved.isAcademicContextEnabled, selection, saved, saved.maxItemsPerCategory));
      const refreshed = await refreshContextOptions(saved);
      if (refreshed) setNotice("Configuración guardada.");
      setConnection(await connectionFor(saved));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    } finally { setBusy(false); }
  }

  async function refreshContextOptions(nextSettings: AISettingsValue) {
    const requestId = contextOptionsRequest.current + 1;
    contextOptionsRequest.current = requestId;
    if (!nextSettings.isAIEnabled || !nextSettings.isAcademicContextEnabled) {
      setAvailableOptions(emptyContextOptions());
      return true;
    }
    try {
      const response = await fetch("/api/ai/context/options", { cache: "no-store" });
      if (!response.ok) throw new Error(await errorMessage(response));
      const nextOptions = await response.json() as ContextOptions;
      if (requestId === contextOptionsRequest.current) setAvailableOptions(nextOptions);
      return true;
    } catch (error) {
      if (requestId === contextOptionsRequest.current) setNotice(error instanceof Error ? error.message : "No se pudieron actualizar las opciones de contexto.");
      return false;
    }
  }

  async function testConnection() { setConnection({ status: "checking", message: "Comprobando Ollama…" }); setConnection(await connectionFor(settings)); }

  async function uploadMaterials(files: FileList) {
    setUploading(true); setNotice("Subiendo material a tu biblioteca privada…");
    try {
      const form = new FormData();
      form.set("subjectId", ""); form.set("topicId", ""); form.set("taskId", ""); form.set("bossId", ""); form.set("type", "OTHER");
      for (const file of Array.from(files)) form.append("files", file, file.name);
      const response = await fetch("/api/materials", { method: "POST", body: form });
      const result = await response.json() as { error?: string; created?: Array<{ id: string; name: string }>; duplicates?: Array<{ name: string }>; failed?: Array<{ name: string }> };
      if (!response.ok && response.status !== 207) throw new Error(result.error ?? "No se pudo adjuntar el material.");
      const created = result.created ?? [];
      setAvailableOptions((current) => ({ ...current, materials: [...created.map((item) => ({ id: item.id, label: item.name })), ...current.materials] }));
      setSelection((current) => ({ ...current, materialIds: [...current.materialIds, ...created.map((item) => item.id)].slice(0, 20) }));
      const details = [created.length ? `${created.length} adjuntado(s)` : "", result.duplicates?.length ? `${result.duplicates.length} duplicado(s)` : "", result.failed?.length ? `${result.failed.length} rechazado(s)` : ""].filter(Boolean).join(" · ");
      setNotice(details || "No se añadió ningún archivo.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo adjuntar el material."); }
    finally { setUploading(false); }
  }

  async function sendMessage(content: string) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true); setNotice("");
    let assistantId = "";
    try {
      const chatId = activeId ?? "new";
      const context = settings.isAcademicContextEnabled && usePersonalContext ? effectiveContextSelection(true, selection, settings, settings.maxItemsPerCategory) : emptyContextSelection;
      const response = await fetch(`/api/ai/chats/${chatId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, requestId: crypto.randomUUID(), context, usePersonalContext }) });
      if (!response.ok || !response.body) throw new Error(await errorMessage(response));
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; if (done && buffer.trim()) lines.push(buffer);
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "meta") { assistantId = event.assistantMessage.id; if (event.chat) { setChats((current) => [event.chat!, ...current]); setActiveId(event.chat.id); window.history.replaceState(null, "", `/app/ai?chat=${event.chat.id}`); } setMessages((current) => [...current, event.userMessage, event.assistantMessage]); }
          else if (event.type === "delta") setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: message.content + event.content } : message));
          else if (event.type === "done") { setMessages((current) => current.map((message) => message.id === event.message.id ? event.message : message)); setSelection(emptyContextSelection); }
          else if (event.type === "warning") setNotice(event.warnings.join(" "));
          else { setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: event.partialContent, status: "ERROR", errorCode: event.error.code } : message)); setNotice(event.error.message); setConnection((current) => event.error.code === "UNAVAILABLE" ? { status: "offline", message: event.error.message } : current); }
        }
        if (done) break;
      }
      setChats((current) => current.map((chat) => chat.id === chatId && chat.title === "Nuevo chat" ? { ...chat, title: content.replace(/\s+/g, " ").slice(0, 80), updatedAt: new Date().toISOString() } : chat));
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo enviar el mensaje."); }
    finally { sending.current = false; setBusy(false); }
  }

  return <section className="mx-auto flex h-[calc(100dvh-5rem)] min-h-[38rem] max-w-[96rem] flex-col px-0 lg:h-screen lg:p-5">
    <div className="flex items-center gap-3 border-b bg-card px-4 py-3 lg:rounded-t-xl lg:border"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Bot className="size-4" /></span><div><h1 className="text-base font-semibold">IA</h1><p className={`text-xs ${!settings.isAIEnabled || connection.status === "offline" ? "text-destructive" : "text-muted-foreground"}`}>{!settings.isAIEnabled ? "La IA está desactivada en tus ajustes." : connection.message}</p></div>{settings.isAIEnabled && connection.status === "offline" && <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={testConnection}><RefreshCw className="size-3.5" />Reintentar</Button>}</div>
    <div className="grid min-h-0 flex-1 bg-card lg:grid-cols-[17rem_1fr] lg:border-x"><ChatSidebar chats={chats} activeId={activeId} disabled={busy} hasMore={Boolean(chatPagination.hasNext)} loadingMore={loadingMoreChats} onLoadMore={loadMoreChats} onCreate={createChat} onSelect={selectChat} onRename={renameChat} onDelete={deleteChat} /><div className="flex min-h-0 flex-col"><AISettingsPanel value={settings} connection={connection} busy={busy} onChange={(value) => { setSettings(value); setSelection(effectiveContextSelection(value.isAIEnabled && value.isAcademicContextEnabled, selection, value, value.maxItemsPerCategory)); if (!value.isAIEnabled || !value.isAcademicContextEnabled) setAvailableOptions(emptyContextOptions()); }} onSave={saveSettings} onTest={testConnection} />{notice && <div className="flex items-start gap-2 border-b bg-muted/60 px-4 py-2 text-xs" role="status"><CircleAlert className="mt-0.5 size-3.5 shrink-0" />{notice}</div>}<MessageList messages={messages} isLoading={loadingChat} canLoadOlder={Boolean(messagePagination.hasNext)} loadingOlder={loadingOlderMessages} onLoadOlder={loadOlderMessages} /><ChatComposer disabled={busy || loadingChat || uploading || !settings.isAIEnabled} contextEnabled={settings.isAIEnabled && settings.isAcademicContextEnabled} usePersonalContext={usePersonalContext} permissions={settings} maxItemsPerCategory={settings.maxItemsPerCategory} options={availableOptions} context={selection} uploading={uploading} onContextChange={setSelection} onPersonalContextChange={(value) => { setUsePersonalContext(value); if (!value) setSelection(emptyContextSelection); }} onUpload={uploadMaterials} onSend={sendMessage} /></div></div>
    <p className="border-t bg-card px-4 py-2 text-center text-[11px] text-muted-foreground lg:rounded-b-xl lg:border">La IA puede equivocarse. Revisa fechas, notas y decisiones académicas importantes.</p>
  </section>;
}
