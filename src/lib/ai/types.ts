export type AIMessageRole = "system" | "user" | "assistant" | "tool";

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
