import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mergeChatList } from "@/components/ai/ai-workspace";
import { AISettingsPanel } from "@/components/ai/ai-settings-panel";
import { ContextPicker } from "@/components/ai/context-picker";
import { MessageList } from "@/components/ai/message-list";
import { emptyContextSelection } from "@/lib/ai/validation";

describe("interfaz de IA", () => {
  it("no muestra un permiso web separado dentro de Preferencias", () => {
    const markup = renderToStaticMarkup(createElement(AISettingsPanel, {
      value: {
        ollamaUrl: "http://127.0.0.1:11434", model: "qwen3.5:9b", isAIEnabled: true, isAcademicContextEnabled: true,
        canReadGrades: true, canReadTasksAndBosses: true, canReadSessionsAndStatistics: true, canReadSchedule: true,
        canReadMaterials: true, canReadGamification: true, contextLimit: 12_000, maxItemsPerCategory: 20,
      },
      connection: { status: "online", message: "Conectado" }, busy: false,
      onChange: () => undefined, onSave: async () => undefined, onTest: async () => undefined,
    }));

    expect(markup).not.toContain("Permitir busquedas web cuando las active en un mensaje");
  });

  it("mantiene un solo chat cuando llega otra respuesta del mismo chat", () => {
    const existing = { id: "cm0000000000000000000000", title: "Primera pregunta", createdAt: "2026-09-13T00:00:00.000Z", updatedAt: "2026-09-13T00:00:00.000Z" };
    const refreshed = { ...existing, title: "Primera pregunta actualizada", updatedAt: "2026-09-13T00:01:00.000Z" };

    const result = mergeChatList([existing], refreshed);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(refreshed);
  });

  it("explica que el contexto autorizado se selecciona automaticamente", () => {
    const markup = renderToStaticMarkup(createElement(ContextPicker, {
      enabled: true,
      value: emptyContextSelection,
      onChange: () => undefined,
      options: { subjects: [], topics: [], tasks: [], bosses: [], grades: [], goals: [], studySessions: [], materials: [] },
    }));
    expect(markup).toContain("El contexto autorizado se usa automaticamente segun la pregunta");
    expect(markup).not.toContain("<details");
    expect(markup).not.toContain("Selecciona");
  });

  it("no renderiza un selector vacio cuando el contexto esta desactivado", () => {
    const markup = renderToStaticMarkup(createElement(ContextPicker, {
      enabled: false,
      value: emptyContextSelection,
      onChange: () => undefined,
      options: { subjects: [], topics: [], tasks: [], bosses: [], grades: [], goals: [], studySessions: [], materials: [] },
    }));
    expect(markup).toBe("");
  });

  it("muestra los fallos del asistente como recuperables", () => {
    const markup = renderToStaticMarkup(createElement(MessageList, {
      isLoading: false,
      messages: [{ id: "message-1", role: "ASSISTANT", content: "Respuesta parcial", status: "ERROR", model: "qwen3.5:9b", errorCode: "UNAVAILABLE", createdAt: "2026-09-13T00:00:00.000Z" }],
    }));
    expect(markup).toContain("Respuesta parcial");
    expect(markup).toContain("Comprueba Ollama y vuelve a intentarlo");
  });

  it("muestra el resumen del contexto usado en cada respuesta", () => {
    const markup = renderToStaticMarkup(createElement(MessageList, {
      isLoading: false,
      messages: [{ id: "message-context", role: "ASSISTANT", content: "Respuesta", status: "COMPLETE", model: "qwen3.5:9b", createdAt: "2026-09-13T00:00:00.000Z", contextSnapshot: { mode: "personal", intent: "today", used: [{ category: "tasksAndBosses", label: "Tareas, Bosses y objetivos", count: 2 }], blocked: [], included: [], omitted: [], warnings: [] } }],
    }));
    expect(markup).toContain("Contexto usado: Tareas, Bosses y objetivos (2)");
    expect(markup).not.toContain("<details");
  });

  it("nombra los elementos que no se analizaron por limite", () => {
    const markup = renderToStaticMarkup(createElement(MessageList, {
      isLoading: false,
      messages: [{ id: "message-omitted", role: "ASSISTANT", content: "Respuesta", status: "COMPLETE", model: "qwen3.5:9b", createdAt: "2026-09-13T00:00:00.000Z", contextSnapshot: { mode: "personal", intent: "materials", used: [], blocked: [], included: [], omitted: [{ type: "material", id: "material-a", label: "Imagen grande" }], warnings: [] } }],
    }));
    expect(markup).toContain("No se analizaron por el limite configurado: Imagen grande");
  });

  it("indica cuando una respuesta se genero sin contexto personal", () => {
    const markup = renderToStaticMarkup(createElement(MessageList, {
      isLoading: false,
      messages: [{ id: "message-no-context", role: "ASSISTANT", content: "Respuesta general", status: "COMPLETE", model: "qwen3.5:9b", createdAt: "2026-09-13T00:00:00.000Z", contextSnapshot: { mode: "none", intent: "today", used: [], blocked: [], included: [], omitted: [], warnings: [] } }],
    }));
    expect(markup).toContain("Sin contexto personal");
  });

  it("renderiza Markdown y formulas del asistente como contenido visual", () => {
    const markup = renderToStaticMarkup(createElement(MessageList, {
      isLoading: false,
      messages: [{ id: "message-2", role: "ASSISTANT", content: "**Objetivo**\n\n1. Explicacion\n2. Formula $CO_2$", status: "COMPLETE", model: "qwen3.5:9b", createdAt: "2026-09-13T00:00:00.000Z" }],
    }));
    expect(markup).toContain("<strong>Objetivo</strong>");
    expect(markup).toContain("<ol class=");
    expect(markup).toContain("katex");
  });

  it("omite HTML crudo de respuestas no confiables", () => {
    const markup = renderToStaticMarkup(createElement(MessageList, {
      isLoading: false,
      messages: [{ id: "message-3", role: "ASSISTANT", content: "<script>alert(1)</script>\n\n**Seguro**", status: "COMPLETE", model: "qwen3.5:9b", createdAt: "2026-09-13T00:00:00.000Z" }],
    }));
    expect(markup).not.toContain("<script>");
    expect(markup).toContain("<strong>Seguro</strong>");
  });
});
