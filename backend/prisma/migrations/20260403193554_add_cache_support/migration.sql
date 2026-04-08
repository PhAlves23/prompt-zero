-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "cacheKey" TEXT,
ADD COLUMN     "fromCache" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "cacheEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cacheTtlSeconds" INTEGER NOT NULL DEFAULT 86400;

-- CreateTable
CREATE TABLE "CacheMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "misses" INTEGER NOT NULL DEFAULT 0,
    "savedCost" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "savedTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CacheMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CacheMetric_userId_periodStart_idx" ON "CacheMetric"("userId", "periodStart");

-- CreateIndex
CREATE INDEX "CacheMetric_workspaceId_periodStart_idx" ON "CacheMetric"("workspaceId", "periodStart");

-- CreateIndex
CREATE INDEX "Execution_fromCache_createdAt_idx" ON "Execution"("fromCache", "createdAt");

-- AddForeignKey
ALTER TABLE "CacheMetric" ADD CONSTRAINT "CacheMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CacheMetric" ADD CONSTRAINT "CacheMetric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
