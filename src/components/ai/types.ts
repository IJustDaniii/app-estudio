import type { ContextSelection } from "@/lib/ai/validation";

export type ChatSummary = { id: string; title: string; createdAt: string; updatedAt: string };
export type ChatMessage = { id: string; role: "USER" | "ASSISTANT"; content: string; status: "PENDING" | "COMPLETE" | "ERROR"; model?: string | null; errorCode?: string | null; createdAt: string };
export type AISettingsValue = { ollamaUrl: string; model: string; isAcademicContextEnabled: boolean; contextLimit: number };
export type ContextOption = { id: string; label: string; mimeType?: string };
export type ContextOptions = {
  subjects: ContextOption[];
  tasks: ContextOption[];
  bosses: ContextOption[];
  grades: ContextOption[];
  goals: ContextOption[];
  studySessions: ContextOption[];
  materials: ContextOption[];
};
export type ConnectionState = { status: "checking" | "online" | "offline"; message: string; isModelAvailable?: boolean; supportsVision?: boolean };
export type { ContextSelection };
