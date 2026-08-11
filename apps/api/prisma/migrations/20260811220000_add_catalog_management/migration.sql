CREATE TYPE "DestinationType" AS ENUM ('CITY', 'PROVINCE');

ALTER TABLE "Video"
  ADD COLUMN "instagramUsername" VARCHAR(30),
  ADD COLUMN "platform" VARCHAR(30),
  ADD COLUMN "personCategory" VARCHAR(40),
  ADD COLUMN "contentType" VARCHAR(40),
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "title" VARCHAR(240),
  ADD COLUMN "placeName" VARCHAR(200),
  ADD COLUMN "placeType" VARCHAR(40),
  ADD COLUMN "publishedDate" VARCHAR(20),
  ADD COLUMN "captionSummary" TEXT,
  ADD COLUMN "evidenceType" VARCHAR(40),
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "mediaUrl" TEXT,
  ADD COLUMN "thumbnailUrl" TEXT,
  ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT';

CREATE TABLE "Destination" (
  "id" UUID NOT NULL,
  "type" "DestinationType" NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "parentProvinceId" UUID,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER,
  "primarySourceUrl" TEXT,
  "sourceType" VARCHAR(60),
  "notes" TEXT,
  "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoDestination" (
  "videoId" VARCHAR(160) NOT NULL,
  "destinationId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoDestination_pkey" PRIMARY KEY ("videoId", "destinationId")
);

CREATE TABLE "VideoHotel" (
  "videoId" VARCHAR(160) NOT NULL,
  "hotelId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoHotel_pkey" PRIMARY KEY ("videoId", "hotelId")
);

CREATE UNIQUE INDEX "Video_sourceUrl_key" ON "Video"("sourceUrl");
CREATE INDEX "Video_instagramUsername_idx" ON "Video"("instagramUsername");
CREATE INDEX "Video_publicationStatus_idx" ON "Video"("publicationStatus");
CREATE UNIQUE INDEX "Destination_type_slug_key" ON "Destination"("type", "slug");
CREATE UNIQUE INDEX "Destination_type_displayOrder_key" ON "Destination"("type", "displayOrder");
CREATE INDEX "Destination_parentProvinceId_idx" ON "Destination"("parentProvinceId");
CREATE INDEX "Destination_publicationStatus_type_displayOrder_idx" ON "Destination"("publicationStatus", "type", "displayOrder");
CREATE INDEX "VideoDestination_destinationId_idx" ON "VideoDestination"("destinationId");
CREATE INDEX "VideoHotel_hotelId_idx" ON "VideoHotel"("hotelId");

ALTER TABLE "Destination" ADD CONSTRAINT "Destination_parentProvinceId_fkey"
  FOREIGN KEY ("parentProvinceId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoDestination" ADD CONSTRAINT "VideoDestination_videoId_fkey"
  FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoDestination" ADD CONSTRAINT "VideoDestination_destinationId_fkey"
  FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoHotel" ADD CONSTRAINT "VideoHotel_videoId_fkey"
  FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoHotel" ADD CONSTRAINT "VideoHotel_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
