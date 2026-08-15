CREATE TYPE "VideoCategory" AS ENUM ('TRAVEL', 'HOTEL');

ALTER TABLE "Video"
ADD COLUMN "videoCategory" "VideoCategory" NOT NULL DEFAULT 'TRAVEL';

UPDATE "Video"
SET "videoCategory" = 'HOTEL'
WHERE "mediaUrl" LIKE '/hotel-videos/%';

CREATE INDEX "Video_videoCategory_publicationStatus_idx"
ON "Video"("videoCategory", "publicationStatus");
