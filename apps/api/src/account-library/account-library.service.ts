import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PublicationStatus } from '../generated/prisma/enums';

const hotelSelect = {
  slug: true,
  name: true,
  city: true,
  imageUrl: true,
  logoUrl: true,
  starRating: true,
} as const;

const personSelect = {
  slug: true,
  displayName: true,
  imageUrl: true,
  primaryCategory: true,
  occupation: true,
  followerCount: true,
} as const;

@Injectable()
export class AccountLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const [hotelLikes, savedHotels, notablePersonLikes, savedNotablePeople] =
      await this.prisma.$transaction([
        this.prisma.userHotelLike.findMany({
          where: {
            userId,
            hotel: { publicationStatus: PublicationStatus.PUBLISHED },
          },
          orderBy: { createdAt: 'desc' },
          select: { hotel: { select: hotelSelect } },
        }),
        this.prisma.userSavedHotel.findMany({
          where: {
            userId,
            hotel: { publicationStatus: PublicationStatus.PUBLISHED },
          },
          orderBy: { createdAt: 'desc' },
          select: { hotel: { select: hotelSelect } },
        }),
        this.prisma.userNotablePersonLike.findMany({
          where: {
            userId,
            notablePerson: {
              publicationStatus: PublicationStatus.PUBLISHED,
            },
          },
          orderBy: { createdAt: 'desc' },
          select: { notablePerson: { select: personSelect } },
        }),
        this.prisma.userSavedNotablePerson.findMany({
          where: {
            userId,
            notablePerson: {
              publicationStatus: PublicationStatus.PUBLISHED,
            },
          },
          orderBy: { createdAt: 'desc' },
          select: { notablePerson: { select: personSelect } },
        }),
      ]);

    return {
      data: {
        likedHotels: hotelLikes.map(({ hotel }) => hotel),
        savedHotels: savedHotels.map(({ hotel }) => hotel),
        likedNotablePeople: notablePersonLikes.map(
          ({ notablePerson }) => notablePerson,
        ),
        savedNotablePeople: savedNotablePeople.map(
          ({ notablePerson }) => notablePerson,
        ),
      },
    };
  }

  async setHotelLike(userId: string, slug: string, active: boolean) {
    const hotelId = await this.findHotelId(slug);
    if (active) {
      await this.prisma.userHotelLike.upsert({
        where: { userId_hotelId: { userId, hotelId } },
        create: { userId, hotelId },
        update: {},
      });
    } else {
      await this.prisma.userHotelLike.deleteMany({
        where: { userId, hotelId },
      });
    }
    return { data: { active } };
  }

  async setHotelSaved(userId: string, slug: string, active: boolean) {
    const hotelId = await this.findHotelId(slug);
    if (active) {
      await this.prisma.userSavedHotel.upsert({
        where: { userId_hotelId: { userId, hotelId } },
        create: { userId, hotelId },
        update: {},
      });
    } else {
      await this.prisma.userSavedHotel.deleteMany({
        where: { userId, hotelId },
      });
    }
    return { data: { active } };
  }

  async setNotablePersonLike(userId: string, slug: string, active: boolean) {
    const notablePersonId = await this.findNotablePersonId(slug);
    if (active) {
      await this.prisma.userNotablePersonLike.upsert({
        where: { userId_notablePersonId: { userId, notablePersonId } },
        create: { userId, notablePersonId },
        update: {},
      });
    } else {
      await this.prisma.userNotablePersonLike.deleteMany({
        where: { userId, notablePersonId },
      });
    }
    return { data: { active } };
  }

  async setNotablePersonSaved(userId: string, slug: string, active: boolean) {
    const notablePersonId = await this.findNotablePersonId(slug);
    if (active) {
      await this.prisma.userSavedNotablePerson.upsert({
        where: { userId_notablePersonId: { userId, notablePersonId } },
        create: { userId, notablePersonId },
        update: {},
      });
    } else {
      await this.prisma.userSavedNotablePerson.deleteMany({
        where: { userId, notablePersonId },
      });
    }
    return { data: { active } };
  }

  private async findHotelId(slug: string) {
    const hotel = await this.prisma.hotel.findFirst({
      where: { slug, publicationStatus: PublicationStatus.PUBLISHED },
      select: { id: true },
    });
    if (!hotel) throw new NotFoundException('The hotel was not found');
    return hotel.id;
  }

  private async findNotablePersonId(slug: string) {
    const person = await this.prisma.notablePerson.findFirst({
      where: { slug, publicationStatus: PublicationStatus.PUBLISHED },
      select: { id: true },
    });
    if (!person)
      throw new NotFoundException('The notable person was not found');
    return person.id;
  }
}
