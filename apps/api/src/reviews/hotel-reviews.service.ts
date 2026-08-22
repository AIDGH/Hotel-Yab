import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  ContentModerationStatus,
  PublicationStatus,
  UserRole,
} from '../generated/prisma/enums';
import { UpsertHotelReviewDto } from './dto/upsert-hotel-review.dto';

@Injectable()
export class HotelReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(hotelSlug: string) {
    const hotel = await this.findPublicHotel(hotelSlug);
    const where = {
      hotelId: hotel.id,
      status: ContentModerationStatus.PUBLISHED,
    };
    const [reviews, summary] = await this.prisma.$transaction([
      this.prisma.hotelReview.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 100,
        select: {
          id: true,
          rating: true,
          body: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.hotelReview.aggregate({
        where,
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    return {
      data: reviews.map(({ user, ...review }) => ({
        ...review,
        reviewerName: publicUserName(user),
        publishedAt: review.publishedAt?.toISOString() ?? null,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      })),
      summary: {
        averageRating: summary._avg.rating,
        reviewCount: summary._count._all,
      },
    };
  }

  async findMine(hotelSlug: string, userId: string) {
    const hotel = await this.findPublicHotel(hotelSlug);
    const review = await this.prisma.hotelReview.findUnique({
      where: { hotelId_userId: { hotelId: hotel.id, userId } },
      select: {
        id: true,
        rating: true,
        body: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      data: review
        ? {
            ...review,
            createdAt: review.createdAt.toISOString(),
            updatedAt: review.updatedAt.toISOString(),
          }
        : null,
    };
  }

  async upsert(
    hotelSlug: string,
    userId: string,
    role: UserRole,
    dto: UpsertHotelReviewDto,
  ) {
    const hotel = await this.findPublicHotel(hotelSlug);
    const publishImmediately =
      role === UserRole.ADMIN || role === UserRole.MODERATOR;
    const status = publishImmediately
      ? ContentModerationStatus.PUBLISHED
      : ContentModerationStatus.PENDING;
    const publishedAt = publishImmediately ? new Date() : null;
    const review = await this.prisma.hotelReview.upsert({
      where: { hotelId_userId: { hotelId: hotel.id, userId } },
      update: {
        rating: dto.rating,
        body: dto.body?.trim() ?? '',
        status,
        moderationNote: null,
        moderatedAt: null,
        moderatedById: null,
        publishedAt,
      },
      create: {
        hotelId: hotel.id,
        userId,
        rating: dto.rating,
        body: dto.body?.trim() ?? '',
        status,
        publishedAt,
      },
      select: {
        id: true,
        rating: true,
        body: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      data: {
        ...review,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      },
    };
  }

  async remove(hotelSlug: string, userId: string) {
    const hotel = await this.findPublicHotel(hotelSlug);
    await this.prisma.hotelReview.deleteMany({
      where: { hotelId: hotel.id, userId },
    });
    return { data: { success: true } };
  }

  private async findPublicHotel(slug: string) {
    const hotel = await this.prisma.hotel.findFirst({
      where: { slug, publicationStatus: PublicationStatus.PUBLISHED },
      select: { id: true },
    });
    if (!hotel) throw new NotFoundException('The hotel was not found');
    return hotel;
  }
}

function publicUserName(user: {
  firstName: string | null;
  lastName: string | null;
}): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') || 'کاربر هتل‌یاب'
  );
}
