-- AlterTable
ALTER TABLE "HotelAssociation"
ADD COLUMN "referenceKey" VARCHAR(200) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "HotelAssociation_referenceKey_key"
ON "HotelAssociation"("referenceKey");
