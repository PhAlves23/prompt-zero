-- CreateTable
CREATE TABLE "ProviderModelPricing" (
    "id" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "model" TEXT NOT NULL,
    "inputCostPer1k" DECIMAL(10,6) NOT NULL,
    "outputCostPer1k" DECIMAL(10,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderModelPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderModelPricing_provider_model_isActive_idx" ON "ProviderModelPricing"("provider", "model", "isActive");

-- CreateIndex
CREATE INDEX "ProviderModelPricing_effectiveFrom_effectiveTo_idx" ON "ProviderModelPricing"("effectiveFrom", "effectiveTo");
