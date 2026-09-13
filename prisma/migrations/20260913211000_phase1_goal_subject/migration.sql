ALTER TABLE "Goal" ADD COLUMN "subjectId" TEXT;

CREATE INDEX "Goal_userId_subjectId_idx" ON "Goal"("userId", "subjectId");

ALTER TABLE "Goal"
  ADD CONSTRAINT "Goal_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
