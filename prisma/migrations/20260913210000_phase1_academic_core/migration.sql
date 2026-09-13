-- Fase 1: datos completos del nucleo academico.
CREATE TYPE "BossStatus" AS ENUM ('UPCOMING', 'PREPARED', 'COMPLETED');
CREATE TYPE "GoalCategory" AS ENUM ('ACADEMIC', 'PERSONAL');

ALTER TABLE "Subject"
  ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'book-open',
  ADD COLUMN "teacher" TEXT,
  ADD COLUMN "room" TEXT,
  ADD COLUMN "difficulty" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "notes" TEXT;

ALTER TABLE "Boss"
  ADD COLUMN "status" "BossStatus" NOT NULL DEFAULT 'UPCOMING';

ALTER TABLE "Grade"
  ADD COLUMN "weight" DOUBLE PRECISION NOT NULL DEFAULT 1;

ALTER TABLE "Goal"
  ADD COLUMN "category" "GoalCategory" NOT NULL DEFAULT 'ACADEMIC';

CREATE TABLE "TimetableChange" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "room" TEXT,
  "isCancelled" BOOLEAN NOT NULL DEFAULT false,
  "baseEntryId" TEXT,
  "subjectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TimetableChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimetableChange_userId_date_idx" ON "TimetableChange"("userId", "date");
CREATE INDEX "TimetableChange_userId_baseEntryId_idx" ON "TimetableChange"("userId", "baseEntryId");

ALTER TABLE "TimetableChange"
  ADD CONSTRAINT "TimetableChange_baseEntryId_fkey"
  FOREIGN KEY ("baseEntryId") REFERENCES "TimetableEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "TimetableChange_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TimetableChange_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
