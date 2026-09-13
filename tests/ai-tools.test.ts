import { describe, expect, it } from "vitest";
import { AI_TOOL_DEFINITIONS, createWriteProposal, executeReadOnlyTool } from "@/lib/ai/tools";
import { streamAIResponse } from "@/lib/ai/chat";
import type { AIProvider } from "@/lib/ai/types";
import { emptyContextSelection } from "@/lib/ai/validation";

describe("AI tools", () => {
  it("exposes only read-only academic tools in this phase", () => {
    expect(AI_TOOL_DEFINITIONS.map((tool) => tool.name)).toEqual([
      "consult_subjects",
      "consult_tasks",
      "consult_bosses",
      "consult_grades",
    ]);
    expect(AI_TOOL_DEFINITIONS.every((tool) => tool.access === "read")).toBe(true);
  });

  it("rejects unknown or write-like tool execution", async () => {
    await expect(executeReadOnlyTool({
      name: "delete_task",
      arguments: {},
      userId: "user-1",
      repository: { subjects: async () => [], tasks: async () => [], bosses: async () => [], grades: async () => [] },
    })).rejects.toThrow("AI_TOOL_NOT_ALLOWED");
  });

  it("marks future write actions as proposals requiring confirmation", () => {
    expect(createWriteProposal("update_task", { id: "task-1" })).toEqual({
      action: "update_task",
      arguments: { id: "task-1" },
      requiresConfirmation: true,
      canExecute: false,
    });
  });

  it("executes a selected read-only tool before continuing the response", async () => {
    let round = 0;
    const provider: AIProvider = {
      id: "fake",
      async testConnection() { throw new Error("unused"); },
      async getModelCapabilities() { return { vision: false, tools: true }; },
      async *streamChat() {
        if (round++ === 0) {
          yield { type: "tool-calls", calls: [{ name: "consult_tasks", arguments: { limit: 1 } }] };
          yield { type: "done" };
        } else {
          yield { type: "text-delta", content: "Tienes una tarea pendiente." };
          yield { type: "done", usage: { outputTokens: 5 } };
        }
      },
    };

    const events = [];
    for await (const event of streamAIResponse({
      provider, baseUrl: "http://localhost:11434", model: "fake", timeoutMs: 100,
      history: [{ role: "USER", content: "¿Qué tarea tengo?" }], contextText: "", images: [],
      selection: { ...emptyContextSelection, taskIds: ["cm0000000000000000000000"] }, userId: "user-1",
      toolRepository: { subjects: async () => [], tasks: async () => [{ title: "Ejercicios" }], bosses: async () => [], grades: async () => [] },
    })) events.push(event);

    expect(events).toEqual([
      { type: "text-delta", content: "Tienes una tarea pendiente." },
      { type: "done", usage: { inputTokens: undefined, outputTokens: 5 } },
    ]);
    expect(round).toBe(2);
  });
});
