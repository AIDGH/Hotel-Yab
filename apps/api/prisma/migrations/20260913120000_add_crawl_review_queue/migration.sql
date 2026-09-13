CREATE TYPE "CrawlReviewBatchStatus" AS ENUM ('REVIEWING', 'READY', 'COMPLETED');
CREATE TYPE "CrawlReviewItemStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "CrawlReviewBatch" (
  "id" UUID NOT NULL,
  "instagramUsername" VARCHAR(30) NOT NULL,
  "sourceFilename" VARCHAR(255) NOT NULL,
  "contentHash" CHAR(64) NOT NULL,
  "status" "CrawlReviewBatchStatus" NOT NULL DEFAULT 'REVIEWING',
  "createdById" UUID NOT NULL,
  "reviewedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CrawlReviewBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrawlReviewItem" (
  "id" UUID NOT NULL,
  "batchId" UUID NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "shortcode" VARCHAR(80) NOT NULL,
  "instagramUsername" VARCHAR(30) NOT NULL,
  "reviewStatus" "CrawlReviewItemStatus" NOT NULL DEFAULT 'PENDING',
  "hotelId" UUID,
  "hotelName" VARCHAR(200),
  "cityIds" UUID[] NOT NULL,
  "provinceIds" UUID[] NOT NULL,
  "finalTitle" VARCHAR(240),
  "placeName" VARCHAR(200),
  "placeType" VARCHAR(40),
  "contentType" VARCHAR(40),
  "captionSummary" TEXT,
  "notes" TEXT,
  "publishedAt" VARCHAR(40),
  "rawPayload" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CrawlReviewItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrawlReviewBatch_contentHash_key"
ON "CrawlReviewBatch"("contentHash");

CREATE INDEX "CrawlReviewBatch_status_updatedAt_idx"
ON "CrawlReviewBatch"("status", "updatedAt");

CREATE INDEX "CrawlReviewBatch_instagramUsername_createdAt_idx"
ON "CrawlReviewBatch"("instagramUsername", "createdAt");

CREATE UNIQUE INDEX "CrawlReviewItem_batchId_sourceUrl_key"
ON "CrawlReviewItem"("batchId", "sourceUrl");

CREATE INDEX "CrawlReviewItem_batchId_displayOrder_idx"
ON "CrawlReviewItem"("batchId", "displayOrder");

CREATE INDEX "CrawlReviewItem_batchId_reviewStatus_idx"
ON "CrawlReviewItem"("batchId", "reviewStatus");

ALTER TABLE "CrawlReviewItem"
ADD CONSTRAINT "CrawlReviewItem_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "CrawlReviewBatch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
