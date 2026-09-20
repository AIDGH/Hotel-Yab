ALTER TABLE "NotablePerson"
ADD COLUMN "instagramCrawlRequest" JSONB,
ADD COLUMN "instagramCrawlRequestUpdatedAt" TIMESTAMPTZ(3);
