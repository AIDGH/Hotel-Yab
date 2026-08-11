ALTER TABLE "Hotel"
ADD COLUMN "starRating" INTEGER;

ALTER TABLE "Hotel"
ADD CONSTRAINT "Hotel_starRating_check"
CHECK ("starRating" IS NULL OR "starRating" BETWEEN 1 AND 5);
