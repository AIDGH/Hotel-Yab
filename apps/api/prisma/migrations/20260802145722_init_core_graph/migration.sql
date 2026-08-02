-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotablePersonCategory" AS ENUM ('ACTOR', 'ATHLETE', 'CREATOR', 'ENTREPRENEUR', 'INFLUENCER', 'MUSICIAN', 'POLITICIAN', 'PUBLIC_FIGURE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssociationType" AS ENUM ('STAYED', 'VISITED', 'ATTENDED_EVENT', 'COLLABORATED', 'ENDORSED', 'OWNED', 'FILMED_AT', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('NEWS_ARTICLE', 'OFFICIAL_WEBSITE', 'SOCIAL_MEDIA_POST', 'INTERVIEW', 'VIDEO', 'PHOTO', 'OTHER');

-- CreateTable
CREATE TABLE "Hotel" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "countryCode" CHAR(2) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "websiteUrl" TEXT,
    "imageUrl" TEXT,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotablePerson" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "primaryCategory" "NotablePersonCategory" NOT NULL,
    "occupation" VARCHAR(200),
    "biography" TEXT,
    "countryCode" CHAR(2),
    "imageUrl" TEXT,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "NotablePerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelAssociation" (
    "id" UUID NOT NULL,
    "hotelId" UUID NOT NULL,
    "notablePersonId" UUID NOT NULL,
    "type" "AssociationType" NOT NULL,
    "summary" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationNotes" TEXT,
    "verifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "HotelAssociation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "publisher" VARCHAR(200),
    "author" VARCHAR(200),
    "publishedAt" TIMESTAMPTZ(3),
    "archivedUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssociationEvidence" (
    "associationId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssociationEvidence_pkey" PRIMARY KEY ("associationId","sourceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_slug_key" ON "Hotel"("slug");

-- CreateIndex
CREATE INDEX "Hotel_countryCode_city_idx" ON "Hotel"("countryCode", "city");

-- CreateIndex
CREATE INDEX "Hotel_publicationStatus_idx" ON "Hotel"("publicationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "NotablePerson_slug_key" ON "NotablePerson"("slug");

-- CreateIndex
CREATE INDEX "NotablePerson_primaryCategory_idx" ON "NotablePerson"("primaryCategory");

-- CreateIndex
CREATE INDEX "NotablePerson_publicationStatus_idx" ON "NotablePerson"("publicationStatus");

-- CreateIndex
CREATE INDEX "HotelAssociation_hotelId_verificationStatus_idx" ON "HotelAssociation"("hotelId", "verificationStatus");

-- CreateIndex
CREATE INDEX "HotelAssociation_notablePersonId_verificationStatus_idx" ON "HotelAssociation"("notablePersonId", "verificationStatus");

-- CreateIndex
CREATE INDEX "HotelAssociation_type_idx" ON "HotelAssociation"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");

-- CreateIndex
CREATE INDEX "AssociationEvidence_sourceId_idx" ON "AssociationEvidence"("sourceId");

-- AddForeignKey
ALTER TABLE "HotelAssociation" ADD CONSTRAINT "HotelAssociation_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelAssociation" ADD CONSTRAINT "HotelAssociation_notablePersonId_fkey" FOREIGN KEY ("notablePersonId") REFERENCES "NotablePerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociationEvidence" ADD CONSTRAINT "AssociationEvidence_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "HotelAssociation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociationEvidence" ADD CONSTRAINT "AssociationEvidence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
