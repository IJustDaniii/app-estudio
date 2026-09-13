import { getMaterialUploadLimits } from "@/lib/materials/constants";

export const MATERIAL_MULTIPART_OVERHEAD = 2 * 1024 * 1024;

export class MaterialBodyTooLargeError extends Error {
  readonly code = "MATERIAL_BODY_TOO_LARGE";

  constructor() {
    super("MATERIAL_BODY_TOO_LARGE");
    this.name = "MaterialBodyTooLargeError";
  }
}

export function isMaterialBodyTooLargeError(error: unknown) {
  let current = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (current instanceof MaterialBodyTooLargeError || current instanceof Error && current.message === "MATERIAL_BODY_TOO_LARGE") return true;
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}

export function getMaterialRequestBodyLimit(limits = getMaterialUploadLimits()) {
  return limits.maxBatchSize + MATERIAL_MULTIPART_OVERHEAD;
}

export function contentLengthExceedsMaterialBodyLimit(contentLength: string | null, limit: number) {
  if (!contentLength) return false;
  const parsed = Number(contentLength);
  return Number.isSafeInteger(parsed) && parsed > limit;
}

export function limitMaterialRequestBody(request: Request, limit: number) {
  if (!request.body) return request;
  const reader = request.body.getReader();
  let received = 0;
  const body = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      received += value.byteLength;
      if (received > limit) {
        await reader.cancel();
        controller.error(new MaterialBodyTooLargeError());
        return;
      }
      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  return new Request(request.url, { method: request.method, headers: request.headers, body, duplex: "half" } as RequestInit);
}
