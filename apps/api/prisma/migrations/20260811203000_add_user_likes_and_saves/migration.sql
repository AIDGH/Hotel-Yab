CREATE TABLE "UserHotelLike" (
    "userId" UUID NOT NULL,
    "hotelId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserHotelLike_pkey" PRIMARY KEY ("userId", "hotelId")
);

CREATE TABLE "UserSavedHotel" (
    "userId" UUID NOT NULL,
    "hotelId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSavedHotel_pkey" PRIMARY KEY ("userId", "hotelId")
);

CREATE TABLE "UserNotablePersonLike" (
    "userId" UUID NOT NULL,
    "notablePersonId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserNotablePersonLike_pkey" PRIMARY KEY ("userId", "notablePersonId")
);

CREATE TABLE "UserSavedNotablePerson" (
    "userId" UUID NOT NULL,
    "notablePersonId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSavedNotablePerson_pkey" PRIMARY KEY ("userId", "notablePersonId")
);

CREATE INDEX "UserHotelLike_hotelId_idx" ON "UserHotelLike"("hotelId");
CREATE INDEX "UserHotelLike_userId_createdAt_idx" ON "UserHotelLike"("userId", "createdAt");
CREATE INDEX "UserSavedHotel_hotelId_idx" ON "UserSavedHotel"("hotelId");
CREATE INDEX "UserSavedHotel_userId_createdAt_idx" ON "UserSavedHotel"("userId", "createdAt");
CREATE INDEX "UserNotablePersonLike_notablePersonId_idx" ON "UserNotablePersonLike"("notablePersonId");
CREATE INDEX "UserNotablePersonLike_userId_createdAt_idx" ON "UserNotablePersonLike"("userId", "createdAt");
CREATE INDEX "UserSavedNotablePerson_notablePersonId_idx" ON "UserSavedNotablePerson"("notablePersonId");
CREATE INDEX "UserSavedNotablePerson_userId_createdAt_idx" ON "UserSavedNotablePerson"("userId", "createdAt");

ALTER TABLE "UserHotelLike" ADD CONSTRAINT "UserHotelLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserHotelLike" ADD CONSTRAINT "UserHotelLike_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSavedHotel" ADD CONSTRAINT "UserSavedHotel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSavedHotel" ADD CONSTRAINT "UserSavedHotel_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserNotablePersonLike" ADD CONSTRAINT "UserNotablePersonLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserNotablePersonLike" ADD CONSTRAINT "UserNotablePersonLike_notablePersonId_fkey" FOREIGN KEY ("notablePersonId") REFERENCES "NotablePerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSavedNotablePerson" ADD CONSTRAINT "UserSavedNotablePerson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSavedNotablePerson" ADD CONSTRAINT "UserSavedNotablePerson_notablePersonId_fkey" FOREIGN KEY ("notablePersonId") REFERENCES "NotablePerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
