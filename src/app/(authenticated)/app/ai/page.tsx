import { requireUserId } from "@/auth";
import { AIWorkspace } from "@/components/ai/ai-workspace";
import type { ChatMessage, ChatSummary, Pagination } from "@/components/ai/types";
import { getAISettings } from "@/lib/ai/repository";
import { chatIdSchema } from "@/lib/ai/validation";
import { prisma } from "@/lib/prisma";

export default async function AIPage({ searchParams }: { searchParams: Promise<{ chat?: string }> }) {
  const userId = await requireUserId();
  const requestedId = chatIdSchema.safeParse((await searchParams).chat).data;
  const [chatRows, chatTotal, settings] = await Promise.all([
    prisma.aIChat.findMany({ where: { userId }, select: { id: true, title: true, createdAt: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.aIChat.count({ where: { userId } }),
    getAISettings(userId),
  ]);
  const requestedChat = requestedId && !chatRows.some((chat) => chat.id === requestedId)
    ? await prisma.aIChat.findFirst({ where: { id: requestedId, userId }, select: { id: true, title: true, createdAt: true, updatedAt: true } })
    : null;
  const allChatRows = requestedChat ? [requestedChat, ...chatRows] : chatRows;
  const activeId = requestedId && allChatRows.some((chat) => chat.id === requestedId) ? requestedId : allChatRows[0]?.id ?? null;
  const [messageRowsDesc, messageTotal] = activeId ? await Promise.all([
    prisma.aIMessage.findMany({ where: { userId, chatId: activeId }, select: { id: true, role: true, content: true, status: true, model: true, errorCode: true, contextSnapshot: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.aIMessage.count({ where: { userId, chatId: activeId } }),
  ]) : [[], 0] as const;
  const messageRows = [...messageRowsDesc].reverse();
  const chats: ChatSummary[] = allChatRows.map((chat) => ({ ...chat, createdAt: chat.createdAt.toISOString(), updatedAt: chat.updatedAt.toISOString() }));
  const messages: ChatMessage[] = messageRows.map((message) => ({ ...message, contextSnapshot: message.contextSnapshot as ChatMessage["contextSnapshot"], createdAt: message.createdAt.toISOString() }));
  const chatPagination: Pagination = { page: 1, pageSize: 50, totalItems: chatTotal, totalPages: Math.ceil(chatTotal / 50), hasPrevious: false, hasNext: chatRows.length >= 50 };
  const messagePagination: Pagination = { page: 1, pageSize: 50, totalItems: messageTotal, totalPages: Math.ceil(messageTotal / 50), hasPrevious: false, hasNext: messageTotal > 50 };
  return <AIWorkspace initialChats={chats} initialChatPagination={chatPagination} initialActiveId={activeId} initialMessages={messages} initialMessagePagination={messagePagination} initialSettings={{ ollamaUrl: settings.ollamaUrl, model: settings.model, isAIEnabled: settings.isAIEnabled, isAcademicContextEnabled: settings.isAcademicContextEnabled, canReadGrades: settings.canReadGrades, canReadTasksAndBosses: settings.canReadTasksAndBosses, canReadSessionsAndStatistics: settings.canReadSessionsAndStatistics, canReadSchedule: settings.canReadSchedule, canReadMaterials: settings.canReadMaterials, canReadGamification: settings.canReadGamification, canUseInternet: settings.canUseInternet, contextLimit: settings.contextLimit, maxItemsPerCategory: settings.maxItemsPerCategory }} contextOptions={{ subjects: [], topics: [], tasks: [], bosses: [], grades: [], goals: [], studySessions: [], materials: [] }} />;
}
