import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  ContentModerationStatus,
  PublicationStatus,
  VerificationStatus,
} from '../generated/prisma/enums';
import { createPaginationMeta, PaginatedResponse } from '../common/pagination';
import { PrismaService } from '../database/prisma.service';
import { HotelQueryDto } from './dto/hotel-query.dto';

const verifiedAssociationWhere = {
  verificationStatus: VerificationStatus.VERIFIED,
  notablePerson: {
    publicationStatus: PublicationStatus.PUBLISHED,
  },
  evidence: {
    some: {},
  },
} satisfies Prisma.HotelAssociationWhereInput;

const visibleAssociationWhere = {
  notablePerson: {
    publicationStatus: PublicationStatus.PUBLISHED,
  },
  OR: [
    { verificationStatus: VerificationStatus.PENDING },
    verifiedAssociationWhere,
  ],
} satisfies Prisma.HotelAssociationWhereInput;

type HotelListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  countryCode: string;
  city: string;
  imageUrl: string | null;
  logoUrl: string | null;
  associationCount: number;
  verifiedAssociationCount: number;
};

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: HotelQueryDto,
  ): Promise<PaginatedResponse<HotelListItem>> {
    const { page, pageSize } = query;
    const searchTokens = query.query
      ? normalizeSearchText(query.query).split(/\s+/).filter(Boolean)
      : [];
    const city = query.city?.trim();
    const countryCode = query.countryCode?.toUpperCase();
    const orderBy: Prisma.HotelOrderByWithRelationInput[] =
      query.sort === 'CITY_ASC'
        ? [{ city: 'asc' }, { name: 'asc' }, { id: 'asc' }]
        : [{ name: 'asc' }, { id: 'asc' }];

    const where = {
      publicationStatus: PublicationStatus.PUBLISHED,
      ...(searchTokens.length > 0
        ? {
            AND: searchTokens.map((token) => ({
              OR: [
                { name: { contains: token, mode: 'insensitive' as const } },
                { city: { contains: token, mode: 'insensitive' as const } },
              ],
            })),
          }
        : {}),
      ...(city ? { city: { equals: city, mode: 'insensitive' as const } } : {}),
      ...(countryCode ? { countryCode } : {}),
    } satisfies Prisma.HotelWhereInput;

    const [hotels, total] = await this.prisma.$transaction([
      this.prisma.hotel.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          countryCode: true,
          city: true,
          imageUrl: true,
          logoUrl: true,
          starRating: true,
          associations: {
            where: verifiedAssociationWhere,
            select: { id: true },
          },
          _count: {
            select: {
              associations: { where: visibleAssociationWhere },
            },
          },
        },
      }),
      this.prisma.hotel.count({ where }),
    ]);

    return {
      data: hotels.map(({ associations, _count, ...hotel }) => ({
        ...hotel,
        associationCount: _count.associations,
        verifiedAssociationCount: associations.length,
      })),
      meta: createPaginationMeta(page, pageSize, total),
    };
  }

  async findBySlug(slug: string) {
    const hotel = await this.prisma.hotel.findFirst({
      where: {
        slug,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        countryCode: true,
        city: true,
        address: true,
        latitude: true,
        longitude: true,
        websiteUrl: true,
        imageUrl: true,
        logoUrl: true,
        starRating: true,
        associations: {
          where: visibleAssociationWhere,
          orderBy: [{ verifiedAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            type: true,
            summary: true,
            occurredAt: true,
            verificationStatus: true,
            verifiedAt: true,
            notablePerson: {
              select: {
                id: true,
                slug: true,
                displayName: true,
                instagramHandle: true,
                primaryCategory: true,
                occupation: true,
                followerCount: true,
                imageUrl: true,
              },
            },
            evidence: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
              select: {
                isPrimary: true,
                note: true,
                source: {
                  select: {
                    id: true,
                    url: true,
                    type: true,
                    title: true,
                    publisher: true,
                    author: true,
                    publishedAt: true,
                    archivedUrl: true,
                  },
                },
              },
            },
          },
        },
        videos: {
          where: {
            video: { publicationStatus: PublicationStatus.PUBLISHED },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            video: {
              select: {
                id: true,
                instagramUsername: true,
                platform: true,
                personCategory: true,
                contentType: true,
                sourceUrl: true,
                title: true,
                placeName: true,
                placeType: true,
                publishedDate: true,
                captionSummary: true,
                evidenceType: true,
                verificationStatus: true,
                notes: true,
                mediaUrl: true,
                thumbnailUrl: true,
                publicationStatus: true,
              },
            },
          },
        },
      },
    });

    if (!hotel) {
      throw new NotFoundException(`Hotel with slug "${slug}" was not found`);
    }

    const rating = await this.prisma.hotelReview.aggregate({
      where: {
        hotelId: hotel.id,
        status: ContentModerationStatus.PUBLISHED,
      },
      _avg: { rating: true },
      _count: { _all: true },
    });

    return {
      data: {
        ...hotel,
        latitude: hotel.latitude === null ? null : Number(hotel.latitude),
        longitude: hotel.longitude === null ? null : Number(hotel.longitude),
        ratingSummary: {
          averageRating: rating._avg.rating,
          reviewCount: rating._count._all,
        },
        associations: hotel.associations.map(
          ({ evidence, ...association }) => ({
            ...association,
            occurredAt: association.occurredAt?.toISOString() ?? null,
            verifiedAt: association.verifiedAt?.toISOString() ?? null,
            sources: evidence.map(({ source, ...link }) => ({
              ...source,
              publishedAt: source.publishedAt?.toISOString() ?? null,
              ...link,
            })),
          }),
        ),
        videos: hotel.videos.map(({ video }) => video),
      },
    };
  }
}

function normalizeSearchText(value: string): string {
  return value
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .trim();
}
