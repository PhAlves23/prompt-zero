-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;

-- RenameIndex
ALTER INDEX "PromptExperimentExposure_experimentId_chosenVariant_createdAt_i" RENAME TO "PromptExperimentExposure_experimentId_chosenVariant_created_idx";
