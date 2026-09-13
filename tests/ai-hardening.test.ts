import { describe, expect, it, beforeEach, vi } from "vitest";
import { z } from "zod";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
import { canUseTools, imagesForModel } from "@/lib/ai/chat";
import { buildAcademicContext } from "@/lib/ai/context";
import { parseAIJson } from "@/lib/ai/http";
import { checkAIRateLimit, resetAIRateLimits } from "@/lib/ai/rate-limit";
import { emptyContextSelection, effectiveContextSelection } from "@/lib/ai/validation";

describe("endurecimiento de IA", () => {
  beforeEach(() => resetAIRateLimits());

  it("anula la selección y las herramientas cuando el contexto está desactivado", async () => {
    const selected = { ...emptyContextSelection, taskIds: ["cm0000000000000000000000"] };
    expect(effectiveContextSelection(false, selected)).toEqual(emptyContextSelection);
    expect(canUseTools(effectiveContextSelection(false, selected), true)).toBe(false);
    const result = await buildAcademicContext({ userId: "u1", isEnabled: false, maxCharacters: 1_000, selection: selected, repository: {
      subjects: async () => { throw new Error("no debe consultar"); }, tasks: async () => { throw new Error("no debe consultar"); }, bosses: async () => [], grades: async () => [], goals: async () => [], studySessions: async () => [], materials: async () => [],
    }, loadMaterial: async () => Buffer.alloc(0) });
    expect(result.text).toBe("");
  });

  it("permite continuar sin tools cuando el modelo no las admite", () => {
    expect(canUseTools({ ...emptyContextSelection, subjectIds: ["cm0000000000000000000000"] }, false)).toBe(false);
    expect(imagesForModel(["img"], false)).toEqual([]);
    expect(imagesForModel(["img"], true)).toEqual(["img"]);
  });

  it("aplica rate limiting por usuario y permite recuperar tras limpiar el estado", () => {
    expect(checkAIRateLimit("u1:send", 2, 60_000).allowed).toBe(true);
    expect(checkAIRateLimit("u1:send", 2, 60_000).allowed).toBe(true);
    const blocked = checkAIRateLimit("u1:send", 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(checkAIRateLimit("u2:send", 2, 60_000).allowed).toBe(true);
    resetAIRateLimits();
    expect(checkAIRateLimit("u1:send", 2, 60_000).allowed).toBe(true);
  });

  it("rechaza cuerpos JSON excesivos antes de validarlos", async () => {
    await expect(parseAIJson(new Request("http://localhost", { method: "POST", body: JSON.stringify({ content: "x".repeat(70_000) }) }), z.object({ content: z.string() }))).rejects.toThrow("AI_BODY_TOO_LARGE");
  });

  it("rechaza cuerpos grandes aunque no declaren Content-Length", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"content":"' + "x".repeat(66_000)));
        controller.enqueue(encoder.encode('x"}'));
        controller.close();
      },
    });
    await expect(parseAIJson(new Request("http://localhost", { method: "POST", body, ...( { duplex: "half" } as Record<string, string> ) }), z.object({ content: z.string() }))).rejects.toThrow("AI_BODY_TOO_LARGE");
  });
});
