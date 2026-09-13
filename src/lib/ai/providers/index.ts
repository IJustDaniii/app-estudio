import type { AIProvider } from "@/lib/ai/types";
import { OllamaProvider } from "@/lib/ai/providers/ollama";

export function getAIProvider(kind: "OLLAMA"): AIProvider {
  if (kind === "OLLAMA") return new OllamaProvider();
  throw new Error("AI_PROVIDER_NOT_SUPPORTED");
}
