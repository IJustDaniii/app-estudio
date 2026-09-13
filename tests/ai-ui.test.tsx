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
      options: { subjects: [], tasks: [], bosses: [], grades: [], goals: [], studySessions: [], materials: [] },
    }));
    expect(markup).toContain("Nada de la base de datos se añade automáticamente");
    expect(markup).toContain("Selecciona sólo lo relevante");
  });

  it("no permite abrir el selector cuando el contexto está desactivado", () => {
    const markup = renderToStaticMarkup(createElement(ContextPicker, {
      enabled: false,
      value: emptyContextSelection,
      onChange: () => undefined,
      options: { subjects: [], tasks: [], bosses: [], grades: [], goals: [], studySessions: [], materials: [] },
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
