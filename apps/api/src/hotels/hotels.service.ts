import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  PublicationStatus,
  VerificationStatus,
} from '../generated/prisma/enums';
import { createPaginationMeta, PaginatedResponse } from '../common/pagination';
import { PrismaService } from '../database/prisma.service';
import { HotelQueryDto } from './dto/hotel-query.dto';

const publicAssociationWhere = {
  verificationStatus: VerificationStatus.VERIFIED,
  notablePerson: {
    publicationStatus: PublicationStatus.PUBLISHED,
  },
  evidence: {
    some: {},
  },
} satisfies Prisma.HotelAssociationWhereInput;

type HotelListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  countryCode: string;
  city: string;
  imageUrl: string | null;
  associationCount: number;
};

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: HotelQueryDto,
  ): Promise<PaginatedResponse<HotelListItem>> {
    const { page, pageSize } = query;
    const search = query.query?.trim();
    const city = query.city?.trim();
    const countryCode = query.countryCode?.toUpperCase();

    const where = {
      publicationStatus: PublicationStatus.PUBLISHED,
      associations: { some: publicAssociationWhere },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { city: { contains: search, mode: 'insensitive' as const } },
            ],
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
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          countryCode: true,
          city: true,
          imageUrl: true,
          _count: {
            select: {
              associations: { where: publicAssociationWhere },
            },
          },
        },
      }),
      this.prisma.hotel.count({ where }),
    ]);

    return {
      data: hotels.map(({ _count, ...hotel }) => ({
        ...hotel,
        associationCount: _count.associations,
      })),
      meta: createPaginationMeta(page, pageSize, total),
    };
  }

  async findBySlug(slug: string) {
    const hotel = await this.prisma.hotel.findFirst({
      where: {
        slug,
        publicationStatus: PublicationStatus.PUBLISHED,
        associations: { some: publicAssociationWhere },
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
        associations: {
          where: publicAssociationWhere,
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
                primaryCategory: true,
                occupation: true,
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
      },
    });

    if (!hotel) {
      throw new NotFoundException(`Hotel with slug "${slug}" was not found`);
    }

    return {
      data: {
        ...hotel,
        latitude: hotel.latitude === null ? null : Number(hotel.latitude),
        longitude: hotel.longitude === null ? null : Number(hotel.longitude),
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
      },
    };
  }
}
