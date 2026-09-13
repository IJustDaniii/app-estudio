import type { z } from "zod";
import { auth } from "@/auth";

const MAX_AI_JSON_BODY_BYTES = 64 * 1024;

export function aiApiError(code: string, message: string, status: number, details?: unknown) {
  return Response.json({ error: { code, message, ...(details === undefined ? {} : { details }) } }, { status });
}

export async function apiUserId() {
  return (await auth())?.user?.id ?? null;
}

export async function parseAIJson<T>(request: Request, schema: z.ZodType<T>) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_AI_JSON_BODY_BYTES) throw new Error("AI_BODY_TOO_LARGE");
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_AI_JSON_BODY_BYTES) throw new Error("AI_BODY_TOO_LARGE");
  return schema.parse(JSON.parse(text || "{}"));
}
