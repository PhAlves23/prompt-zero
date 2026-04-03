-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "filters" JSONB,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "timeoutMs" INTEGER NOT NULL DEFAULT 60000;

-- AlterTable
ALTER TABLE "WebhookDelivery" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "requestHeaders" JSONB;
