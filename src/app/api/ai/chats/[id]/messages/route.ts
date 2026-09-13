import type { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AIProviderError } from "@/lib/ai/errors";
import { streamAIResponse } from "@/lib/ai/chat";
import { buildAcademicContext } from "@/lib/ai/context";
import { aiApiError, apiUserId, parseAIJson } from "@/lib/ai/http";
import { getAIProvider } from "@/lib/ai/providers";
import { academicContextRepository, getAISettings, scopedReadOnlyToolRepository } from "@/lib/ai/repository";
import { chatIdSchema, defaultChatTitle, sendMessageSchema } from "@/lib/ai/validation";
import { getStorageProvider } from "@/lib/materials/storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_ASSISTANT_CHARACTERS = 50_000;
const DEFAULT_AI_TIMEOUT_MS = 120_000;

function requestTimeout() {
  const value = Number(process.env.AI_REQUEST_TIMEOUT_MS);
  return Number.isSafeInteger(value) && value >= 5_000 ? Math.min(value, 300_000) : DEFAULT_AI_TIMEOUT_MS;
}

function streamLine(value: unknown) {
  return `${JSON.stringify(value)}\n`;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await apiUserId();
  if (!userId) return aiApiError("UNAUTHORIZED", "No autorizado", 401);
  const chatId = chatIdSchema.safeParse((await context.params).id).data;
  if (!chatId) return aiApiError("NOT_FOUND", "Chat no encontrado", 404);

  try {
    const data = await parseAIJson(request, sendMessageSchema);
    const [chat, settings] = await Promise.all([
      prisma.aIChat.findFirst({ where: { id: chatId, userId }, select: { id: true, title: true } }),
      getAISettings(userId),
    ]);
    if (!chat) return aiApiError("NOT_FOUND", "Chat no encontrado", 404);

    const [historyDesc, academicContext] = await Promise.all([
      prisma.aIMessage.findMany({ where: { chatId, userId, status: "COMPLETE" }, select: { role: true, content: true }, orderBy: { createdAt: "desc" }, take: 40 }),
      buildAcademicContext({
        userId,
        isEnabled: settings.isAcademicContextEnabled,
        maxCharacters: settings.contextLimit,
        selection: data.context,
        repository: academicContextRepository,
        loadMaterial: (storageKey) => getStorageProvider().get(storageKey),
      }),
    ]);

    const snapshot = { selection: data.context, ...academicContext.snapshot, warnings: academicContext.warnings } as Prisma.InputJsonValue;
    const shouldRename = chat.title === "Nuevo chat" && historyDesc.length === 0;
    const [userMessage, assistantMessage] = await prisma.$transaction([
      prisma.aIMessage.create({ data: { chatId, userId, role: "USER", content: data.content, status: "COMPLETE", contextSnapshot: snapshot }, select: { id: true, role: true, content: true, status: true, createdAt: true } }),
      prisma.aIMessage.create({ data: { chatId, userId, role: "ASSISTANT", content: "", status: "PENDING", model: settings.model }, select: { id: true, role: true, content: true, status: true, createdAt: true } }),
      prisma.aIChat.update({ where: { id: chatId }, data: { ...(shouldRename ? { title: defaultChatTitle(data.content) } : {}), updatedAt: new Date() } }),
    ]);

    const encoder = new TextEncoder();
    const provider = getAIProvider(settings.provider);
    const generationController = new AbortController();
    const abortGeneration = () => generationController.abort();
    request.signal.addEventListener("abort", abortGeneration, { once: true });

    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let assistantContent = "";
        const warnings = [...academicContext.warnings];
        const send = (event: unknown) => controller.enqueue(encoder.encode(streamLine(event)));
        send({ type: "meta", userMessage, assistantMessage, context: academicContext.snapshot, warnings });
        try {
          let images = academicContext.images.map((image) => image.base64);
          if (images.length) {
            const capabilities = await provider.getModelCapabilities({ baseUrl: settings.ollamaUrl, model: settings.model, timeoutMs: 5_000, signal: generationController.signal });
            if (!capabilities.vision) {
              images = [];
              warnings.push("El modelo activo no admite imágenes; se omitieron en esta respuesta.");
              send({ type: "warning", warnings });
            }
          }

          let usage: { inputTokens?: number; outputTokens?: number } | undefined;
          const history = [...historyDesc.reverse(), { role: "USER" as const, content: data.content }];
          for await (const event of streamAIResponse({
            provider,
            baseUrl: settings.ollamaUrl,
            model: settings.model,
            timeoutMs: requestTimeout(),
            history,
            contextText: academicContext.text,
            images,
            selection: data.context,
            userId,
            toolRepository: scopedReadOnlyToolRepository(data.context),
            signal: generationController.signal,
          })) {
            if (event.type === "text-delta") {
              if (assistantContent.length + event.content.length > MAX_ASSISTANT_CHARACTERS) throw new AIProviderError("PROVIDER_ERROR");
              assistantContent += event.content;
              send({ type: "delta", content: event.content });
            } else usage = event.usage;
          }
          const completed = await prisma.aIMessage.update({ where: { id: assistantMessage.id }, data: { content: assistantContent, status: "COMPLETE", inputTokens: usage?.inputTokens, outputTokens: usage?.outputTokens }, select: { id: true, role: true, content: true, status: true, model: true, errorCode: true, createdAt: true } });
          await prisma.aIChat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
          send({ type: "done", message: completed, warnings });
        } catch (error) {
          const safeError = error instanceof AIProviderError ? error : new AIProviderError("PROVIDER_ERROR", { cause: error });
          await prisma.aIMessage.update({ where: { id: assistantMessage.id }, data: { content: assistantContent, status: "ERROR", errorCode: safeError.code } }).catch(() => undefined);
          send({ type: "error", error: { code: safeError.code, message: safeError.message }, partialContent: assistantContent });
        } finally {
          request.signal.removeEventListener("abort", abortGeneration);
          controller.close();
        }
      },
      cancel() {
        generationController.abort();
      },
    });

    return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Accel-Buffering": "no" } });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === "AI_BODY_TOO_LARGE")) return aiApiError("VALIDATION_ERROR", "El mensaje o el contexto no son válidos", 422);
    return aiApiError("INTERNAL_ERROR", "No se pudo preparar el mensaje", 500);
  }
}
