import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContextPicker } from "@/components/ai/context-picker";
import { MessageList } from "@/components/ai/message-list";
import { emptyContextSelection } from "@/lib/ai/validation";

describe("interfaz de IA", () => {
  it("explica que el contexto requiere selección explícita", () => {
    const markup = renderToStaticMarkup(createElement(ContextPicker, {
      enabled: true,
      value: emptyContextSelection,
      onChange: () => undefined,
      options: { subjects: [], topics: [], tasks: [], bosses: [], grades: [], goals: [], studySessions: [], materials: [] },
    }));
    expect(markup).toContain("La pregunta guía una selección compacta");
    expect(markup).toContain("Selecciona sólo lo relevante");
  });

  it("no permite abrir el selector cuando el contexto está desactivado", () => {
    const markup = renderToStaticMarkup(createElement(ContextPicker, {
      enabled: false,
      value: emptyContextSelection,
      onChange: () => undefined,
      options: { subjects: [], topics: [], tasks: [], bosses: [], grades: [], goals: [], studySessions: [], materials: [] },
    }));
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toContain("Selecciona sólo lo relevante");
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

  it("indica cuando una respuesta se generó sin contexto personal", () => {
    const markup = renderToStaticMarkup(createElement(MessageList, {
      isLoading: false,
      messages: [{ id: "message-no-context", role: "ASSISTANT", content: "Respuesta general", status: "COMPLETE", model: "qwen3.5:9b", createdAt: "2026-09-13T00:00:00.000Z", contextSnapshot: { mode: "none", intent: "today", used: [], blocked: [], included: [], omitted: [], warnings: [] } }],
    }));
    expect(markup).toContain("Sin contexto personal");
  });

  it("renderiza Markdown y fórmulas del asistente como contenido visual", () => {
    const markup = renderToStaticMarkup(createElement(MessageList, {
      isLoading: false,
      messages: [{ id: "message-2", role: "ASSISTANT", content: "**Objetivo**\n\n1. Explicación\n2. Fórmula $CO_2$", status: "COMPLETE", model: "qwen3.5:9b", createdAt: "2026-09-13T00:00:00.000Z" }],
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
