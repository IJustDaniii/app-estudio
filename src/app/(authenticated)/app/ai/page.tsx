import { requireUserId } from "@/auth";
import { AIWorkspace } from "@/components/ai/ai-workspace";
import type { ChatMessage, ChatSummary } from "@/components/ai/types";
import { getAIContextOptions, getAISettings } from "@/lib/ai/repository";
import { chatIdSchema } from "@/lib/ai/validation";
import { prisma } from "@/lib/prisma";

export default async function AIPage({ searchParams }: { searchParams: Promise<{ chat?: string }> }) {
  const userId = await requireUserId();
  const requestedId = chatIdSchema.safeParse((await searchParams).chat).data;
  const [chatRows, settings, contextOptions] = await Promise.all([
    prisma.aIChat.findMany({ where: { userId }, select: { id: true, title: true, createdAt: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 50 }),
    getAISettings(userId),
    getAIContextOptions(userId),
  ]);
  const activeId = chatRows.some((chat) => chat.id === requestedId) ? requestedId! : chatRows[0]?.id ?? null;
  const messageRows = activeId ? await prisma.aIMessage.findMany({ where: { userId, chatId: activeId }, select: { id: true, role: true, content: true, status: true, model: true, errorCode: true, createdAt: true }, orderBy: { createdAt: "asc" }, take: 200 }) : [];
  const chats: ChatSummary[] = chatRows.map((chat) => ({ ...chat, createdAt: chat.createdAt.toISOString(), updatedAt: chat.updatedAt.toISOString() }));
  const messages: ChatMessage[] = messageRows.map((message) => ({ ...message, createdAt: message.createdAt.toISOString() }));
  return <AIWorkspace initialChats={chats} initialActiveId={activeId} initialMessages={messages} initialSettings={{ ollamaUrl: settings.ollamaUrl, model: settings.model, isAcademicContextEnabled: settings.isAcademicContextEnabled, contextLimit: settings.contextLimit }} contextOptions={contextOptions} />;
}
