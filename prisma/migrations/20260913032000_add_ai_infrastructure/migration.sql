-- CreateEnum
CREATE TYPE "AIProviderKind" AS ENUM ('OLLAMA');

-- CreateEnum
CREATE TYPE "AIMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AIMessageStatus" AS ENUM ('PENDING', 'COMPLETE', 'ERROR');

-- CreateTable
CREATE TABLE "AISettings" (
    "userId" TEXT NOT NULL,
    "provider" "AIProviderKind" NOT NULL DEFAULT 'OLLAMA',
    "ollamaUrl" TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434',
    "model" TEXT NOT NULL DEFAULT 'qwen3.5:9b',
    "isAcademicContextEnabled" BOOLEAN NOT NULL DEFAULT true,
    "contextLimit" INTEGER NOT NULL DEFAULT 12000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AISettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AIChat" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Nuevo chat',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "status" "AIMessageStatus" NOT NULL DEFAULT 'COMPLETE',
    "model" TEXT,
    "errorCode" TEXT,
    "contextSnapshot" JSONB,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIChat_id_userId_key" ON "AIChat"("id", "userId");

-- CreateIndex
CREATE INDEX "AIChat_userId_updatedAt_idx" ON "AIChat"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AIMessage_userId_chatId_createdAt_idx" ON "AIMessage"("userId", "chatId", "createdAt");

-- AddForeignKey
ALTER TABLE "AISettings" ADD CONSTRAINT "AISettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIChat" ADD CONSTRAINT "AIChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_chatId_userId_fkey" FOREIGN KEY ("chatId", "userId") REFERENCES "AIChat"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
