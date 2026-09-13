import { z } from "zod";
import type { AIToolDefinition } from "@/lib/ai/types";

const querySchema = z.object({
  query: z.string().trim().max(120).optional(),
  subjectId: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

export const AI_TOOL_DEFINITIONS: AIToolDefinition[] = [
  { name: "consult_subjects", description: "Consulta asignaturas del usuario por nombre.", access: "read", parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_tasks", description: "Consulta tareas del usuario relevantes para la pregunta.", access: "read", parameters: { type: "object", properties: { query: { type: "string" }, subjectId: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_bosses", description: "Consulta Bosses o exámenes del usuario relevantes para la pregunta.", access: "read", parameters: { type: "object", properties: { query: { type: "string" }, subjectId: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "consult_grades", description: "Consulta notas del usuario relevantes para la pregunta.", access: "read", parameters: { type: "object", properties: { query: { type: "string" }, subjectId: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
];

export interface ReadOnlyToolRepository {
  subjects(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  tasks(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  bosses(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
  grades(userId: string, args: z.infer<typeof querySchema>): Promise<unknown[]>;
}

export async function executeReadOnlyTool(input: { name: string; arguments: unknown; userId: string; repository: ReadOnlyToolRepository }) {
  const args = querySchema.parse(input.arguments);
  switch (input.name) {
    case "consult_subjects": return input.repository.subjects(input.userId, args);
    case "consult_tasks": return input.repository.tasks(input.userId, args);
    case "consult_bosses": return input.repository.bosses(input.userId, args);
    case "consult_grades": return input.repository.grades(input.userId, args);
    default: throw new Error("AI_TOOL_NOT_ALLOWED");
  }
}

export function createWriteProposal(action: string, arguments_: Record<string, unknown>) {
  return { action, arguments: arguments_, requiresConfirmation: true as const, canExecute: false as const };
}
