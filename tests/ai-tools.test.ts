import { describe, expect, it } from "vitest";
import { AI_TOOL_DEFINITIONS, createWriteProposal, executeReadOnlyTool } from "@/lib/ai/tools";

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
});
