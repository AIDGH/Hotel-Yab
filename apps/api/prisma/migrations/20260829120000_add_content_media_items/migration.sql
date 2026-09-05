CREATE TYPE "ContentKind" AS ENUM ('VIDEO', 'POST', 'STORY');
CREATE TYPE "ContentMediaType" AS ENUM ('IMAGE', 'VIDEO');

ALTER TABLE "Video"
ADD COLUMN "contentKind" "ContentKind" NOT NULL DEFAULT 'VIDEO';

CREATE TABLE "VideoMediaItem" (
  "videoId" VARCHAR(160) NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "mediaType" "ContentMediaType" NOT NULL,
  "mediaUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoMediaItem_pkey" PRIMARY KEY ("videoId", "displayOrder")
);

INSERT INTO "VideoMediaItem" (
  "videoId",
  "displayOrder",
  "mediaType",
  "mediaUrl",
  "thumbnailUrl"
)
SELECT
  "id",
  1,
  'VIDEO'::"ContentMediaType",
  "mediaUrl",
  "thumbnailUrl"
FROM "Video"
WHERE "mediaUrl" IS NOT NULL;

CREATE INDEX "VideoMediaItem_mediaType_idx"
ON "VideoMediaItem"("mediaType");

ALTER TABLE "VideoMediaItem"
ADD CONSTRAINT "VideoMediaItem_videoId_fkey"
FOREIGN KEY ("videoId") REFERENCES "Video"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
