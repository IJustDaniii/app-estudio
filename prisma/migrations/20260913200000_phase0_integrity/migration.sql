-- Add a stable claim key so a retried study session cannot be stored twice for one user.
ALTER TABLE "StudySession" ADD COLUMN "requestId" TEXT;

CREATE UNIQUE INDEX "StudySession_userId_requestId_key" ON "StudySession"("userId", "requestId");
