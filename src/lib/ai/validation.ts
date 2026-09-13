import { z } from "zod";

export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const DEFAULT_AI_MODEL = "qwen3.5:9b";
export const DEFAULT_AI_CONTEXT_LIMIT = 12_000;
export const AI_CHAT_TITLE_MAX_LENGTH = 80;
export const AI_MESSAGE_MAX_LENGTH = 8_000;
export const AI_CONTEXT_ITEM_LIMIT = 20;

export const ollamaUrlSchema = z.string().trim().max(200).transform((raw, context) => {
  try {
    const url = new URL(raw);
    const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    if (url.protocol !== "http:" || !isLoopback || url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
      context.addIssue({ code: "custom", message: "La URL debe ser HTTP y apuntar a Ollama en este equipo." });
      return z.NEVER;
    }
    return url.origin;
  } catch {
    context.addIssue({ code: "custom", message: "La URL de Ollama no es válida." });
    return z.NEVER;
  }
});

export const aiModelSchema = z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)?$/, "Nombre de modelo no válido");

export const aiSettingsSchema = z.object({
  ollamaUrl: ollamaUrlSchema,
  model: aiModelSchema,
  isAcademicContextEnabled: z.boolean(),
  contextLimit: z.number().int().min(1_000).max(50_000),
});

export const aiConnectionTestSchema = aiSettingsSchema.pick({ ollamaUrl: true, model: true });

export const listChatsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

const idList = z.array(z.string().cuid()).max(AI_CONTEXT_ITEM_LIMIT);

export const contextSelectionSchema = z.object({
  subjectIds: idList.default([]),
  taskIds: idList.default([]),
  bossIds: idList.default([]),
  gradeIds: idList.default([]),
  goalIds: idList.default([]),
  studySessionIds: idList.default([]),
  materialIds: idList.default([]),
});

export type ContextSelection = z.infer<typeof contextSelectionSchema>;

export const emptyContextSelection: ContextSelection = {
  subjectIds: [], taskIds: [], bossIds: [], gradeIds: [], goalIds: [], studySessionIds: [], materialIds: [],
};

export const createChatSchema = z.object({ title: z.string().trim().min(1).max(AI_CHAT_TITLE_MAX_LENGTH).optional() }).default({});
export const renameChatSchema = z.object({ title: z.string().trim().min(1).max(AI_CHAT_TITLE_MAX_LENGTH) });
export const chatIdSchema = z.string().cuid();
export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(AI_MESSAGE_MAX_LENGTH),
  context: contextSelectionSchema.default(emptyContextSelection),
});

export function defaultChatTitle(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.slice(0, AI_CHAT_TITLE_MAX_LENGTH) || "Nuevo chat";
}
