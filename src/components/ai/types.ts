import type { AIContextSnapshot } from "@/lib/ai/types";
import type { AIAcademicPermissions, ContextSelection } from "@/lib/ai/validation";

export type ChatSummary = { id: string; title: string; createdAt: string; updatedAt: string };
export type ChatMessage = { id: string; role: "USER" | "ASSISTANT"; content: string; status: "PENDING" | "COMPLETE" | "ERROR"; model?: string | null; errorCode?: string | null; contextSnapshot?: AIContextSnapshot | null; createdAt: string };
export type Pagination = { page: number; pageSize: number; totalItems: number; totalPages: number; hasPrevious?: boolean; hasNext?: boolean };
export type AISettingsValue = { ollamaUrl: string; model: string; isAIEnabled: boolean; isAcademicContextEnabled: boolean; contextLimit: number; maxItemsPerCategory: number } & AIAcademicPermissions;
export type ContextOption = { id: string; label: string; mimeType?: string };
export type ContextOptions = {
  subjects: ContextOption[];
  topics: ContextOption[];
  tasks: ContextOption[];
  bosses: ContextOption[];
  grades: ContextOption[];
  goals: ContextOption[];
  studySessions: ContextOption[];
  materials: ContextOption[];
};
export type ConnectionState = { status: "checking" | "online" | "offline"; message: string; isModelAvailable?: boolean; supportsVision?: boolean };
export type { AIContextSnapshot, AIAcademicPermissions, ContextSelection };
