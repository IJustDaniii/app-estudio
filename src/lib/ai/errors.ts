export type AIProviderErrorCode = "UNAVAILABLE" | "TIMEOUT" | "MODEL_NOT_FOUND" | "INVALID_RESPONSE" | "UNSUPPORTED_VISION" | "PROVIDER_ERROR";

const safeMessages: Record<AIProviderErrorCode, string> = {
  UNAVAILABLE: "Ollama no está disponible. Inícialo y vuelve a intentarlo.",
  TIMEOUT: "Ollama tardó demasiado en responder. Puedes volver a intentarlo.",
  MODEL_NOT_FOUND: "El modelo configurado no está instalado en Ollama.",
  INVALID_RESPONSE: "Ollama devolvió una respuesta que no se pudo interpretar.",
  UNSUPPORTED_VISION: "El modelo activo no admite imágenes.",
  PROVIDER_ERROR: "Ollama no pudo completar la respuesta.",
};

export class AIProviderError extends Error {
  constructor(public readonly code: AIProviderErrorCode, options?: { cause?: unknown }) {
    super(safeMessages[code], options);
    this.name = "AIProviderError";
  }
}

export function asAIProviderError(error: unknown) {
  if (error instanceof AIProviderError) return error;
  if (error instanceof DOMException && error.name === "AbortError") return new AIProviderError("TIMEOUT", { cause: error });
  return new AIProviderError("UNAVAILABLE", { cause: error });
}
