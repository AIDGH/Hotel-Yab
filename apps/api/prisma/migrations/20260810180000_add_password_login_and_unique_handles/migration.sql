ALTER TABLE "User"
ADD COLUMN "username" VARCHAR(30),
ADD COLUMN "passwordHash" VARCHAR(255);

ALTER TABLE "HotelReview"
ADD COLUMN "moderatedAt" TIMESTAMPTZ(3),
ADD COLUMN "moderatedById" UUID;

ALTER TABLE "VideoComment"
ADD COLUMN "moderatedAt" TIMESTAMPTZ(3),
ADD COLUMN "moderatedById" UUID;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
DROP INDEX "User_instagramHandle_idx";
CREATE UNIQUE INDEX "User_instagramHandle_key" ON "User"("instagramHandle");
CREATE INDEX "HotelReview_moderatedById_moderatedAt_idx" ON "HotelReview"("moderatedById", "moderatedAt");
CREATE INDEX "VideoComment_moderatedById_moderatedAt_idx" ON "VideoComment"("moderatedById", "moderatedAt");

ALTER TABLE "HotelReview" ADD CONSTRAINT "HotelReview_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
