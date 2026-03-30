-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('openai', 'anthropic', 'google', 'openrouter');

-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "credentialId" TEXT,
ADD COLUMN     "provider" "ProviderType" NOT NULL DEFAULT 'openai';

-- CreateTable
CREATE TABLE "ProviderCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "label" TEXT,
    "apiKeyEnc" TEXT NOT NULL,
    "baseUrl" TEXT,
    "organizationId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderCredential_userId_provider_isActive_idx" ON "ProviderCredential"("userId", "provider", "isActive");

-- CreateIndex
CREATE INDEX "Execution_provider_model_createdAt_idx" ON "Execution"("provider", "model", "createdAt");

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "ProviderCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
