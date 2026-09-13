import { describe, expect, it } from "vitest";
import { AIProviderError } from "@/lib/ai/errors";
import { OllamaProvider } from "@/lib/ai/providers/ollama";
import { ollamaUrlSchema } from "@/lib/ai/validation";

function streamResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), { status: 200, headers: { "content-type": "application/x-ndjson" } });
}

describe("OllamaProvider", () => {
  it("allows only loopback HTTP URLs", () => {
    expect(ollamaUrlSchema.parse("http://localhost:11434/")).toBe("http://localhost:11434");
    expect(ollamaUrlSchema.safeParse("http://169.254.169.254:11434").success).toBe(false);
    expect(ollamaUrlSchema.safeParse("https://example.com").success).toBe(false);
    expect(ollamaUrlSchema.safeParse("http://localhost:11434/api").success).toBe(false);
    expect(ollamaUrlSchema.safeParse("http://localhost:8080").success).toBe(true);
    expect(ollamaUrlSchema.safeParse("http://localhost.evil:11434").success).toBe(false);
  });
  it("reports model availability and capabilities", async () => {
    const requests: string[] = [];
    const provider = new OllamaProvider(async (input) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith("/api/tags")) {
        return Response.json({ models: [{ name: "qwen3.5:9b", model: "qwen3.5:9b" }] });
      }
      return Response.json({ capabilities: ["completion", "vision", "tools"] });
    });

    const status = await provider.testConnection({
      baseUrl: "http://127.0.0.1:11434",
      model: "qwen3.5:9b",
      timeoutMs: 1_000,
    });

    expect(status).toEqual({
      isAvailable: true,
      isModelAvailable: true,
      capabilities: { vision: true, tools: true },
      models: ["qwen3.5:9b"],
    });
    expect(requests).toEqual([
      "http://127.0.0.1:11434/api/tags",
      "http://127.0.0.1:11434/api/show",
    ]);
  });

  it("parses NDJSON even when a JSON object is split between chunks", async () => {
    const provider = new OllamaProvider(async () => streamResponse([
      '{"message":{"role":"assistant","content":"Ho',
      'la"},"done":false}\n{"message":{"role":"assistant","content":" mundo"},"done":false}\n',
      '{"message":{"role":"assistant","content":""},"done":true,"eval_count":2}\n',
    ]));

    const events = [];
    for await (const event of provider.streamChat({
      baseUrl: "http://localhost:11434",
      model: "qwen3.5:9b",
      messages: [{ role: "user", content: "Saluda" }],
      timeoutMs: 1_000,
    })) events.push(event);

    expect(events).toEqual([
      { type: "text-delta", content: "Hola" },
      { type: "text-delta", content: " mundo" },
      { type: "done", usage: { outputTokens: 2 } },
    ]);
  });

  it("classifies an unreachable local server without leaking fetch errors", async () => {
    const provider = new OllamaProvider(async () => { throw new TypeError("connect ECONNREFUSED 127.0.0.1"); });

    await expect(provider.testConnection({
      baseUrl: "http://127.0.0.1:11434",
      model: "qwen3.5:9b",
      timeoutMs: 100,
    })).rejects.toMatchObject({ code: "UNAVAILABLE" } satisfies Partial<AIProviderError>);
  });

  it("rejects malformed provider stream data", async () => {
    const provider = new OllamaProvider(async () => streamResponse(["not-json\n"]));
    const consume = async () => {
      for await (const event of provider.streamChat({
        baseUrl: "http://127.0.0.1:11434",
        model: "qwen3.5:9b",
        messages: [{ role: "user", content: "Hola" }],
        timeoutMs: 1_000,
      })) void event;
    };

    await expect(consume()).rejects.toMatchObject({ code: "INVALID_RESPONSE" } satisfies Partial<AIProviderError>);
  });

  it("omits tools, vision payloads and applies the output token limit when unsupported", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const provider = new OllamaProvider(async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return streamResponse(['{"message":{"role":"assistant","content":"ok"},"done":true}\n']);
    });

    for await (const _event of provider.streamChat({
      baseUrl: "http://localhost:11434", model: "small", timeoutMs: 1_000,
      messages: [{ role: "user", content: "hola", images: ["base64"] }],
      tools: undefined, maxOutputTokens: 123,
    })) void _event;

    expect(requestBody).toMatchObject({ options: { num_predict: 123 } });
    expect(requestBody).not.toHaveProperty("tools");
  });
});
