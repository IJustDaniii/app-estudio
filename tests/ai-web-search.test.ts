import { describe, expect, it, vi } from "vitest";
import { searchWeb, WebSearchError } from "@/lib/ai/web-search";

const html = `
  <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Factualidad">Titulo &amp; fuente</a>
  <a class="result__snippet">Resumen &lt;seguro&gt;</a>
`;

describe("busqueda web segura", () => {
  it("exige consentimiento explicito", async () => {
    await expect(searchWeb({ query: "noticias", consent: false, fetcher: vi.fn() })).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
  });

  it("devuelve fuentes externas saneadas sin enviar contexto personal", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(html, { status: 200, headers: { "content-type": "text/html" } }));
    const result = await searchWeb({ query: "actualidad", consent: true, fetcher });
    expect(result.results[0]).toMatchObject({ title: "Titulo & fuente", url: "https://example.com/actualidad" });
    expect(result.results[0].snippet).toContain("<seguro>");
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain("contexto");
    expect(result.results[0].source).toBe("example.com");
  });

  it("filtra dominios no permitidos y bloquea urls privadas", async () => {
    const privateHtml = '<a rel="nofollow" class="result__a" href="https://127.0.0.1/admin">Privado</a><a rel="nofollow" class="result__a" href="https://allowed.example/page">Permitido</a>';
    const fetcher = vi.fn().mockResolvedValue(new Response(privateHtml, { status: 200 }));
    const result = await searchWeb({ query: "test", consent: true, allowedDomains: ["allowed.example"], fetcher });
    expect(result.results.map((item) => item.url)).toEqual(["https://allowed.example/page"]);
    expect(result.omitted).toContain("127.0.0.1");
  });

  it("limita consulta, tiempo y tamano de respuesta", async () => {
    const fetcher = vi.fn().mockImplementation((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("timeout", "AbortError")), { once: true });
    }));
    await expect(searchWeb({ query: "x".repeat(300), consent: true, fetcher })).rejects.toBeInstanceOf(WebSearchError);
    await expect(searchWeb({ query: "ok", consent: true, fetcher, timeoutMs: 10 })).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});
