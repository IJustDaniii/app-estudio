export type AIMessageRole = "system" | "user" | "assistant" | "tool";

export type AIContextCategory = "subjects" | "tasksAndBosses" | "grades" | "sessionsAndStatistics" | "schedule" | "materials" | "gamification";
export type AIContextIntent = "today" | "subject" | "performance" | "schedule" | "gamification" | "planning" | "sessions" | "materials" | "personal" | "general";
export type AIContextSnapshotItem = { type: string; id: string; label: string };
export type AIContextCategorySummary = { category: AIContextCategory; label: string; count: number };
export type AIContextSnapshot = {
  mode: "personal" | "none";
  intent: AIContextIntent;
  used: AIContextCategorySummary[];
  blocked: Array<{ category: AIContextCategory; label: string }>;
  included: AIContextSnapshotItem[];
  omitted: AIContextSnapshotItem[];
  warnings: string[];
};

export type AIMessageInput = {
  role: AIMessageRole;
  content: string;
  images?: string[];
  toolName?: string;
  toolCalls?: AIToolCall[];
};

export type AIToolDefinition = {
  name: string;
  description: string;
  access: "read";
  parameters: Record<string, unknown>;
};

export type AIToolCall = {
  name: string;
  arguments: unknown;
};

export type AIStreamEvent =
  | { type: "text-delta"; content: string }
  | { type: "tool-calls"; calls: AIToolCall[] }
  | { type: "done"; usage?: { inputTokens?: number; outputTokens?: number } };

export type AIModelCapabilities = { vision: boolean; tools: boolean };

export type AIConnectionStatus = {
  isAvailable: boolean;
  isModelAvailable: boolean;
  capabilities: AIModelCapabilities;
  models: string[];
};

export type AIProviderRequest = {
  baseUrl: string;
  model: string;
  messages: AIMessageInput[];
  tools?: AIToolDefinition[];
  timeoutMs: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
};

export interface AIProvider {
  readonly id: string;
  testConnection(input: { baseUrl: string; model: string; timeoutMs: number; signal?: AbortSignal }): Promise<AIConnectionStatus>;
  getModelCapabilities(input: { baseUrl: string; model: string; timeoutMs: number; signal?: AbortSignal }): Promise<AIModelCapabilities>;
  streamChat(input: AIProviderRequest): AsyncIterable<AIStreamEvent>;
}
