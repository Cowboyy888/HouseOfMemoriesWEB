-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "AiModuleName" AS ENUM ('CUSTOMER_ASSISTANT', 'RECOMMENDATION', 'DYNAMIC_PRICING', 'PREDICTIVE_MAINTENANCE', 'BUSINESS_INTELLIGENCE', 'DOCUMENT_OCR', 'FRAUD_DETECTION', 'SENTIMENT_ANALYSIS', 'REPORTING');

-- CreateTable
CREATE TABLE "ai_request_logs" (
    "id" TEXT NOT NULL,
    "module" "AiModuleName" NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "customerId" TEXT,
    "promptSummary" TEXT NOT NULL,
    "responseSummary" TEXT,
    "succeeded" BOOLEAN NOT NULL,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_request_logs_module_createdAt_idx" ON "ai_request_logs"("module", "createdAt");

-- CreateIndex
CREATE INDEX "ai_request_logs_customerId_createdAt_idx" ON "ai_request_logs"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_request_logs" ADD CONSTRAINT "ai_request_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
