CREATE INDEX "CrawlReviewBatch_createdById_createdAt_idx"
ON "CrawlReviewBatch"("createdById", "createdAt");

ALTER TABLE "CrawlReviewBatch"
ADD CONSTRAINT "CrawlReviewBatch_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
