-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('running', 'stopped');

-- CreateEnum
CREATE TYPE "ExperimentVariant" AS ENUM ('A', 'B');

-- CreateTable
CREATE TABLE "PromptExperiment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptAId" TEXT NOT NULL,
    "promptBId" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'running',
    "sampleSizeTarget" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptExperimentExposure" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "chosenVariant" "ExperimentVariant" NOT NULL,
    "executionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptExperimentExposure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptExperimentVote" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "exposureId" TEXT NOT NULL,
    "winnerVariant" "ExperimentVariant" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptExperimentVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptExperiment_userId_status_createdAt_idx" ON "PromptExperiment"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PromptExperiment_promptAId_idx" ON "PromptExperiment"("promptAId");

-- CreateIndex
CREATE INDEX "PromptExperiment_promptBId_idx" ON "PromptExperiment"("promptBId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptExperimentExposure_executionId_key" ON "PromptExperimentExposure"("executionId");

-- CreateIndex
CREATE INDEX "PromptExperimentExposure_experimentId_createdAt_idx" ON "PromptExperimentExposure"("experimentId", "createdAt");

-- CreateIndex
CREATE INDEX "PromptExperimentExposure_experimentId_chosenVariant_createdAt_idx" ON "PromptExperimentExposure"("experimentId", "chosenVariant", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromptExperimentVote_exposureId_key" ON "PromptExperimentVote"("exposureId");

-- CreateIndex
CREATE INDEX "PromptExperimentVote_experimentId_winnerVariant_createdAt_idx" ON "PromptExperimentVote"("experimentId", "winnerVariant", "createdAt");

-- AddForeignKey
ALTER TABLE "PromptExperiment" ADD CONSTRAINT "PromptExperiment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptExperiment" ADD CONSTRAINT "PromptExperiment_promptAId_fkey" FOREIGN KEY ("promptAId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptExperiment" ADD CONSTRAINT "PromptExperiment_promptBId_fkey" FOREIGN KEY ("promptBId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptExperimentExposure" ADD CONSTRAINT "PromptExperimentExposure_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "PromptExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptExperimentExposure" ADD CONSTRAINT "PromptExperimentExposure_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptExperimentVote" ADD CONSTRAINT "PromptExperimentVote_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "PromptExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptExperimentVote" ADD CONSTRAINT "PromptExperimentVote_exposureId_fkey" FOREIGN KEY ("exposureId") REFERENCES "PromptExperimentExposure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
