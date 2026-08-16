/*
  Warnings:

  - The values [CREATOR,ENTREPRENEUR,POLITICIAN,OTHER] on the enum `NotablePersonCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotablePersonCategory_new" AS ENUM ('ACTOR', 'ATHLETE', 'INFLUENCER', 'MUSICIAN', 'PUBLIC_FIGURE');
ALTER TABLE "NotablePerson" ALTER COLUMN "primaryCategory" TYPE "NotablePersonCategory_new" USING ("primaryCategory"::text::"NotablePersonCategory_new");
ALTER TYPE "NotablePersonCategory" RENAME TO "NotablePersonCategory_old";
ALTER TYPE "NotablePersonCategory_new" RENAME TO "NotablePersonCategory";
DROP TYPE "public"."NotablePersonCategory_old";
COMMIT;

-- AlterTable
ALTER TABLE "NotablePerson" ADD COLUMN     "followersUpdatedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "FollowerSnapshot" (
    "id" UUID NOT NULL,
    "notablePersonId" UUID NOT NULL,
    "followerCount" INTEGER NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "capturedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowerSnapshot_notablePersonId_capturedAt_idx" ON "FollowerSnapshot"("notablePersonId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FollowerSnapshot_notablePersonId_snapshotDate_key" ON "FollowerSnapshot"("notablePersonId", "snapshotDate");

-- AddForeignKey
ALTER TABLE "FollowerSnapshot" ADD CONSTRAINT "FollowerSnapshot_notablePersonId_fkey" FOREIGN KEY ("notablePersonId") REFERENCES "NotablePerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
