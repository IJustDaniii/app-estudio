import { describe, expect, it, vi } from "vitest";
import { AI_TOOL_DEFINITIONS, createWriteProposal, executeReadOnlyTool } from "@/lib/ai/tools";
import { emptyReadOnlyToolRepository } from "@/lib/ai/repository";
import { streamAIResponse } from "@/lib/ai/chat";
import type { AIProvider } from "@/lib/ai/types";
import { emptyContextSelection } from "@/lib/ai/validation";

describe("AI tools", () => {
  it("exposes read-only academic tools and a separate web lookup", () => {
    expect(AI_TOOL_DEFINITIONS.map((tool) => tool.name)).toEqual([
      "consult_subjects",
      "consult_topics",
      "consult_tasks",
      "consult_bosses",
      "consult_goals",
      "consult_grades",
      "consult_study_sessions",
      "consult_statistics",
      "consult_schedule",
      "consult_calendar",
      "consult_materials",
      "consult_gamification",
      "search_web",
    ]);
    expect(AI_TOOL_DEFINITIONS.every((tool) => tool.access === "read")).toBe(true);
  });

  it("does not expose action proposals unless the plan enables them", async () => {
    const { toolDefinitionsForPermissions } = await import("@/lib/ai/tools");
    const definitions = toolDefinitionsForPermissions(undefined, [], ["propose_action"], { includeAction: true });
    expect(definitions.map((tool) => tool.name)).toEqual(["propose_action"]);
    expect(definitions[0].access).toBe("propose");
  });

  it("rejects unknown or write-like tool execution", async () => {
    await expect(executeReadOnlyTool({
      name: "delete_task",
      arguments: {},
      userId: "user-1",
      repository: { subjects: async () => [], tasks: async () => [], bosses: async () => [], grades: async () => [] },
    })).rejects.toThrow("AI_TOOL_NOT_ALLOWED");
  });

  it("solo ejecuta la busqueda web cuando el mensaje tiene consentimiento", async () => {
    const webSearch = vi.fn().mockResolvedValue({ source: "internet", query: "noticias", results: [], omitted: [] });
    const repository = { subjects: async () => [], tasks: async () => [], bosses: async () => [], grades: async () => [], webSearch };
    await expect(executeReadOnlyTool({ name: "search_web", arguments: { query: "noticias" }, userId: "user-1", repository })).rejects.toThrow("AI_WEB_NOT_ALLOWED");
    await expect(executeReadOnlyTool({ name: "search_web", arguments: { query: "noticias" }, userId: "user-1", repository, allowWebSearch: true })).resolves.toMatchObject({ source: "internet" });
    expect(webSearch).toHaveBeenCalledWith("user-1", { query: "noticias" });
  });

  it("mantiene la busqueda web disponible aunque el contexto personal este apagado", async () => {
    expect(emptyReadOnlyToolRepository.webSearch).toBeTypeOf("function");
    const webSearch = vi.fn().mockResolvedValue({ source: "internet", query: "actualidad", results: [], omitted: [] });
    const result = await executeReadOnlyTool({ name: "search_web", arguments: { query: "actualidad" }, userId: "user-1", repository: { ...emptyReadOnlyToolRepository, webSearch }, allowWebSearch: true }) as { source: string };
    expect(result.source).toBe("internet");
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

  it("emite una propuesta para confirmacion y no ejecuta la mutacion durante el streaming", async () => {
    let round = 0;
    const proposalCreator = vi.fn().mockResolvedValue({ id: "proposal-a", action: "create_subject", entity: "asignatura", summary: "Crear asignatura: Fisica.", expiresAt: new Date().toISOString(), confirmationToken: "a".repeat(64) });
    const provider: AIProvider = {
      id: "fake",
      async testConnection() { throw new Error("unused"); },
      async getModelCapabilities() { return { vision: false, tools: true }; },
      async *streamChat() {
        if (round++ === 0) {
          yield { type: "tool-calls", calls: [{ name: "propose_action", arguments: { action: "create_subject", arguments: { name: "Fisica", color: "blue" } } }] };
          yield { type: "done" };
        } else {
          yield { type: "text-delta", content: "Te he preparado una propuesta." };
          yield { type: "done" };
        }
      },
    };
    const events = [];
    for await (const event of streamAIResponse({
      provider, baseUrl: "http://localhost:11434", model: "fake", timeoutMs: 100,
      history: [{ role: "USER", content: "Crea Fisica" }], contextText: "", images: [], selection: emptyContextSelection,
      userId: "user-1", toolRepository: { subjects: async () => [], tasks: async () => [], bosses: async () => [], grades: async () => [] },
      availableTools: [{ name: "propose_action", description: "proposal", access: "propose", parameters: {} }], allowTools: true,
      actionProposalCreator: proposalCreator, requestId: "request-a", chatId: "chat-a",
    })) events.push(event);

    expect(proposalCreator).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", requestId: "request-a", chatId: "chat-a" }));
    expect(events).toEqual(expect.arrayContaining([{ type: "action-proposal", proposal: expect.objectContaining({ id: "proposal-a" }) }]));
    expect(events.at(-1)).toMatchObject({ type: "done" });
  });

  it("does not send tools when the active model lacks tool support", async () => {
    let receivedTools: unknown;
    const provider: AIProvider = {
      id: "fake",
      async testConnection() { throw new Error("unused"); },
      async getModelCapabilities() { return { vision: false, tools: false }; },
      async *streamChat(input) { receivedTools = input.tools; yield { type: "text-delta", content: "ok" }; yield { type: "done" }; },
    };
    for await (const _event of streamAIResponse({
      provider, baseUrl: "http://localhost:11434", model: "small", timeoutMs: 100,
      history: [{ role: "USER", content: "consulta" }], contextText: "", images: [],
      selection: { ...emptyContextSelection, taskIds: ["cm0000000000000000000000"] }, userId: "user-1",
      toolRepository: { subjects: async () => [], tasks: async () => [], bosses: async () => [], grades: async () => [] }, allowTools: false,
    })) void _event;
    expect(receivedTools).toBeUndefined();
  });
});
