ALTER TABLE "AISettings"
  ADD COLUMN "canUseInternet" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "AIActionStatus" AS ENUM ('PENDING', 'EXECUTING', 'EXECUTED', 'CANCELLED', 'EXPIRED', 'FAILED');

CREATE TABLE "AIActionProposal" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "arguments" JSONB NOT NULL,
  "argumentHash" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "status" "AIActionStatus" NOT NULL DEFAULT 'PENDING',
  "confirmationTokenHash" TEXT NOT NULL,
  "requestId" TEXT,
  "result" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "chatId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIActionProposal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AIActionProposal_confirmationTokenHash_key" UNIQUE ("confirmationTokenHash"),
  CONSTRAINT "AIActionProposal_userId_requestId_key" UNIQUE ("userId", "requestId"),
  CONSTRAINT "AIActionProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AIActionProposal_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "AIChat"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AIActionProposal_userId_status_expiresAt_idx" ON "AIActionProposal"("userId", "status", "expiresAt");

CREATE TABLE "AIAuditLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "proposalId" TEXT,
  "userId" TEXT NOT NULL,
  "chatId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIAuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AIAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AIAuditLog_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "AIChat"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AIAuditLog_userId_createdAt_idx" ON "AIAuditLog"("userId", "createdAt");
CREATE INDEX "AIAuditLog_userId_proposalId_idx" ON "AIAuditLog"("userId", "proposalId");
