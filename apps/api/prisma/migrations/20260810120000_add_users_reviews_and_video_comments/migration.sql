CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');
CREATE TYPE "ContentModerationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'HIDDEN');

CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "mobile" VARCHAR(16) NOT NULL,
  "firstName" VARCHAR(80),
  "lastName" VARCHAR(100),
  "email" VARCHAR(254),
  "instagramHandle" VARCHAR(30),
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "notablePersonId" UUID,
  "lastLoginAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSession" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "userAgent" VARCHAR(500),
  "ipAddress" VARCHAR(64),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OtpChallenge" (
  "id" UUID NOT NULL,
  "mobile" VARCHAR(16) NOT NULL,
  "codeHash" CHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HotelReview" (
  "id" UUID NOT NULL,
  "hotelId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "status" "ContentModerationStatus" NOT NULL DEFAULT 'PENDING',
  "moderationNote" TEXT,
  "publishedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "HotelReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HotelReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE TABLE "Video" (
  "id" VARCHAR(160) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoComment" (
  "id" UUID NOT NULL,
  "videoId" VARCHAR(160) NOT NULL,
  "userId" UUID NOT NULL,
  "parentId" UUID,
  "body" TEXT NOT NULL,
  "status" "ContentModerationStatus" NOT NULL DEFAULT 'PENDING',
  "moderationNote" TEXT,
  "publishedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "VideoComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_notablePersonId_key" ON "User"("notablePersonId");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_instagramHandle_idx" ON "User"("instagramHandle");
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
CREATE INDEX "OtpChallenge_mobile_createdAt_idx" ON "OtpChallenge"("mobile", "createdAt");
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");
CREATE UNIQUE INDEX "HotelReview_hotelId_userId_key" ON "HotelReview"("hotelId", "userId");
CREATE INDEX "HotelReview_hotelId_status_createdAt_idx" ON "HotelReview"("hotelId", "status", "createdAt");
CREATE INDEX "HotelReview_userId_createdAt_idx" ON "HotelReview"("userId", "createdAt");
CREATE INDEX "VideoComment_videoId_status_createdAt_idx" ON "VideoComment"("videoId", "status", "createdAt");
CREATE INDEX "VideoComment_userId_createdAt_idx" ON "VideoComment"("userId", "createdAt");
CREATE INDEX "VideoComment_parentId_idx" ON "VideoComment"("parentId");

ALTER TABLE "User" ADD CONSTRAINT "User_notablePersonId_fkey" FOREIGN KEY ("notablePersonId") REFERENCES "NotablePerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HotelReview" ADD CONSTRAINT "HotelReview_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HotelReview" ADD CONSTRAINT "HotelReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "VideoComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
