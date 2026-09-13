CREATE TYPE "CrawlReviewProcessingStatus" AS ENUM ('IDLE', 'RUNNING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "CrawlReviewBatch"
ADD COLUMN "processingStatus" "CrawlReviewProcessingStatus" NOT NULL DEFAULT 'IDLE',
ADD COLUMN "processingStartedAt" TIMESTAMPTZ(3),
ADD COLUMN "processingFinishedAt" TIMESTAMPTZ(3),
ADD COLUMN "processingLog" TEXT,
ADD COLUMN "processedById" UUID;

CREATE INDEX "CrawlReviewBatch_processingStatus_updatedAt_idx"
ON "CrawlReviewBatch"("processingStatus", "updatedAt");

CREATE INDEX "CrawlReviewBatch_processedById_processingStartedAt_idx"
ON "CrawlReviewBatch"("processedById", "processingStartedAt");

ALTER TABLE "CrawlReviewBatch"
ADD CONSTRAINT "CrawlReviewBatch_processedById_fkey"
FOREIGN KEY ("processedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
