import { describe, expect, it } from "vitest";
import { AIProviderError } from "@/lib/ai/errors";
import { OllamaProvider } from "@/lib/ai/providers/ollama";

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
});
