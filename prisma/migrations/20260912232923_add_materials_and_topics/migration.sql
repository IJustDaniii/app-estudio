-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('NOTES', 'EXERCISES', 'EXAM', 'SOLUTIONS', 'THEORY', 'RUBRIC', 'PROJECT', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialProcessingStatus" AS ENUM ('PENDING', 'PROCESSED', 'ERROR');

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "processingStatus" "MaterialProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "isCompletedExam" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT,
    "topicId" TEXT,
    "taskId" TEXT,
    "bossId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Topic_userId_subjectId_idx" ON "Topic"("userId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_subjectId_name_key" ON "Topic"("subjectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Material_storageKey_key" ON "Material"("storageKey");

-- CreateIndex
CREATE INDEX "Material_userId_uploadedAt_idx" ON "Material"("userId", "uploadedAt");

-- CreateIndex
CREATE INDEX "Material_userId_subjectId_idx" ON "Material"("userId", "subjectId");

-- CreateIndex
CREATE INDEX "Material_userId_type_idx" ON "Material"("userId", "type");

-- CreateIndex
CREATE INDEX "Material_userId_isFavorite_idx" ON "Material"("userId", "isFavorite");

-- CreateIndex
CREATE UNIQUE INDEX "Material_userId_sha256_key" ON "Material"("userId", "sha256");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss"("id") ON DELETE SET NULL ON UPDATE CASCADE;
