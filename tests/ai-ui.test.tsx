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

  it("muestra los fallos del asistente como recuperables", () => {
    const markup = renderToStaticMarkup(createElement(MessageList, {
      isLoading: false,
      messages: [{ id: "message-1", role: "ASSISTANT", content: "Respuesta parcial", status: "ERROR", model: "qwen3.5:9b", errorCode: "UNAVAILABLE", createdAt: "2026-09-13T00:00:00.000Z" }],
    }));
    expect(markup).toContain("Respuesta parcial");
    expect(markup).toContain("Comprueba Ollama y vuelve a intentarlo");
  });
});
