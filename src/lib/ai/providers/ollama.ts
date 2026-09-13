import { z } from "zod";
import { AIProviderError, asAIProviderError } from "@/lib/ai/errors";
import type { AIConnectionStatus, AIModelCapabilities, AIProvider, AIProviderRequest, AIStreamEvent } from "@/lib/ai/types";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const tagsSchema = z.object({
  models: z.array(z.object({ name: z.string(), model: z.string().optional() })),
});

const showSchema = z.object({ capabilities: z.array(z.string()).default([]) });

const toolCallSchema = z.object({
  function: z.object({ name: z.string(), arguments: z.unknown() }),
});

const streamChunkSchema = z.object({
  message: z.object({
    role: z.string().optional(),
    content: z.string().default(""),
    tool_calls: z.array(toolCallSchema).optional(),
  }),
  done: z.boolean(),
  prompt_eval_count: z.number().int().nonnegative().optional(),
  eval_count: z.number().int().nonnegative().optional(),
});

function requestControl(timeoutMs: number, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    didTimeout: () => didTimeout,
    cleanup() {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onAbort);
    },
  };
}

function capabilities(values: string[]): AIModelCapabilities {
  return { vision: values.includes("vision"), tools: values.includes("tools") };
}

async function parseJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  try {
    return schema.parse(await response.json());
  } catch (error) {
    throw new AIProviderError("INVALID_RESPONSE", { cause: error });
  }
}

function errorForResponse(response: Response) {
  return new AIProviderError(response.status === 404 ? "MODEL_NOT_FOUND" : "PROVIDER_ERROR");
}

export class OllamaProvider implements AIProvider {
  readonly id = "ollama";

  constructor(private readonly fetcher: FetchLike = fetch) {}

  async testConnection(input: { baseUrl: string; model: string; timeoutMs: number; signal?: AbortSignal }): Promise<AIConnectionStatus> {
    const control = requestControl(input.timeoutMs, input.signal);
    try {
      const response = await this.fetcher(`${input.baseUrl}/api/tags`, { signal: control.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw errorForResponse(response);
      const data = await parseJson(response, tagsSchema);
      const models = data.models.map((item) => item.model ?? item.name);
      const isModelAvailable = models.includes(input.model) || data.models.some((item) => item.name === input.model);
      const modelCapabilities = isModelAvailable
        ? await this.getModelCapabilities({ ...input, signal: control.signal })
        : { vision: false, tools: false };
      return { isAvailable: true, isModelAvailable, capabilities: modelCapabilities, models };
    } catch (error) {
      if (control.didTimeout()) throw new AIProviderError("TIMEOUT", { cause: error });
      throw asAIProviderError(error);
    } finally {
      control.cleanup();
    }
  }

  async getModelCapabilities(input: { baseUrl: string; model: string; timeoutMs: number; signal?: AbortSignal }): Promise<AIModelCapabilities> {
    const control = requestControl(input.timeoutMs, input.signal);
    try {
      const response = await this.fetcher(`${input.baseUrl}/api/show`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ model: input.model, verbose: false }),
        signal: control.signal,
      });
      if (!response.ok) throw errorForResponse(response);
      return capabilities((await parseJson(response, showSchema)).capabilities);
    } catch (error) {
      if (control.didTimeout()) throw new AIProviderError("TIMEOUT", { cause: error });
      throw asAIProviderError(error);
    } finally {
      control.cleanup();
    }
  }

  async *streamChat(input: AIProviderRequest): AsyncIterable<AIStreamEvent> {
    const control = requestControl(input.timeoutMs, input.signal);
    try {
      const response = await this.fetcher(`${input.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({
          model: input.model,
          messages: input.messages.map((message) => ({
            role: message.role,
            content: message.content,
            ...(message.images?.length ? { images: message.images } : {}),
            ...(message.toolName ? { tool_name: message.toolName } : {}),
          })),
          ...(input.tools?.length ? { tools: input.tools.map((tool) => ({ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.parameters } })) } : {}),
          stream: true,
          think: false,
        }),
        signal: control.signal,
      });
      if (!response.ok) throw errorForResponse(response);
      if (!response.body) throw new AIProviderError("INVALID_RESPONSE");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        if (done && buffer.trim()) lines.push(buffer);
        for (const line of lines) {
          if (!line.trim()) continue;
          let parsed: z.infer<typeof streamChunkSchema>;
          try {
            parsed = streamChunkSchema.parse(JSON.parse(line));
          } catch (error) {
            throw new AIProviderError("INVALID_RESPONSE", { cause: error });
          }
          if (parsed.message.content) yield { type: "text-delta", content: parsed.message.content };
          if (parsed.message.tool_calls?.length) {
            yield { type: "tool-calls", calls: parsed.message.tool_calls.map((call) => ({ name: call.function.name, arguments: call.function.arguments })) };
          }
          if (parsed.done) yield { type: "done", usage: { inputTokens: parsed.prompt_eval_count, outputTokens: parsed.eval_count } };
        }
        if (done) break;
      }
    } catch (error) {
      if (control.didTimeout()) throw new AIProviderError("TIMEOUT", { cause: error });
      throw asAIProviderError(error);
    } finally {
      control.cleanup();
    }
  }
}
