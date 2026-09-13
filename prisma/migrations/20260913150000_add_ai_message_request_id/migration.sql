ALTER TABLE "AIMessage"
  ADD COLUMN "requestId" TEXT;

CREATE UNIQUE INDEX "AIMessage_userId_requestId_key"
  ON "AIMessage"("userId", "requestId");
