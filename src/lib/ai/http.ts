import type { z } from "zod";
import { auth } from "@/auth";

export const MAX_AI_JSON_BODY_BYTES = 64 * 1024;

export function aiApiError(code: string, message: string, status: number, details?: unknown) {
  return Response.json({ error: { code, message, ...(details === undefined ? {} : { details }) } }, { status });
}

export function aiRateLimitError(retryAfterSeconds: number) {
  return new Response(JSON.stringify({ error: { code: "RATE_LIMITED", message: "Demasiadas solicitudes de IA. Espera un momento y vuelve a intentarlo." } }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" },
  });
}

export async function apiUserId() {
  return (await auth())?.user?.id ?? null;
}

export async function parseAIJson<T>(request: Request, schema: z.ZodType<T>) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_AI_JSON_BODY_BYTES) throw new Error("AI_BODY_TOO_LARGE");
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  if (request.body) {
    const reader = request.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_AI_JSON_BODY_BYTES) {
          await reader.cancel().catch(() => undefined);
          throw new Error("AI_BODY_TOO_LARGE");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const text = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
  return schema.parse(JSON.parse(text || "{}"));
}
