import { Injectable, NotFoundException } from '@nestjs/common';
import { createPaginationMeta, PaginatedResponse } from '../common/pagination';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import {
  PublicationStatus,
  VerificationStatus,
} from '../generated/prisma/enums';
import { NotablePersonQueryDto } from './dto/notable-person-query.dto';
import { createPersianSearchVariants } from '../common/search-text';

const verifiedAssociationWhere = {
  verificationStatus: VerificationStatus.VERIFIED,
  hotel: {
    publicationStatus: PublicationStatus.PUBLISHED,
  },
  evidence: {
    some: {},
  },
} satisfies Prisma.HotelAssociationWhereInput;

const visibleAssociationWhere = {
  hotel: {
    publicationStatus: PublicationStatus.PUBLISHED,
  },
  OR: [
    { verificationStatus: VerificationStatus.PENDING },
    verifiedAssociationWhere,
  ],
} satisfies Prisma.HotelAssociationWhereInput;

const personVideoSelect = {
  id: true,
  videoCategory: true,
  contentKind: true,
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
  mediaItems: {
    orderBy: { displayOrder: 'asc' },
    select: {
      displayOrder: true,
      mediaType: true,
      mediaUrl: true,
      thumbnailUrl: true,
    },
  },
  publicationStatus: true,
  destinations: {
    select: {
      destination: {
        select: {
          id: true,
          type: true,
          slug: true,
          name: true,
          description: true,
          imageUrl: true,
          parentProvinceId: true,
          parentProvince: { select: { slug: true, name: true } },
          isFeatured: true,
          displayOrder: true,
          primarySourceUrl: true,
          sourceType: true,
          notes: true,
          publicationStatus: true,
        },
      },
    },
  },
  hotels: {
    select: { hotel: { select: { id: true, slug: true, name: true } } },
  },
} satisfies Prisma.VideoSelect;

type NotablePersonListItem = {
  id: string;
  slug: string;
  displayName: string;
  instagramHandle: string | null;
  primaryCategory: string;
  occupation: string | null;
  followerCount: number | null;
  countryCode: string | null;
  imageUrl: string | null;
  associationCount: number;
  verifiedAssociationCount: number;
};

@Injectable()
export class NotablePeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: NotablePersonQueryDto,
  ): Promise<PaginatedResponse<NotablePersonListItem>> {
    const { page, pageSize } = query;
    const search = query.query?.trim();
    const searchVariants = search ? createPersianSearchVariants(search) : [];
    const countryCode = query.countryCode?.toUpperCase();
    const sort = query.sort ?? 'FOLLOWERS_DESC';
    const orderBy: Prisma.NotablePersonOrderByWithRelationInput[] =
      sort === 'NAME_ASC'
        ? [{ displayName: 'asc' }, { id: 'asc' }]
        : sort === 'HOTEL_COUNT_DESC'
          ? [
              { associations: { _count: 'desc' } },
              { displayName: 'asc' },
              { id: 'asc' },
            ]
          : [
              { followerCount: { sort: 'desc', nulls: 'last' } },
              { displayName: 'asc' },
              { id: 'asc' },
            ];

    const where = {
      publicationStatus: PublicationStatus.PUBLISHED,
      ...(searchVariants.length > 0
        ? {
            OR: searchVariants.flatMap((variant) => [
              {
                displayName: {
                  contains: variant,
                  mode: 'insensitive' as const,
                },
              },
              {
                occupation: {
                  contains: variant,
                  mode: 'insensitive' as const,
                },
              },
              {
                instagramHandle: {
                  contains: variant,
                  mode: 'insensitive' as const,
                },
              },
            ]),
          }
        : {}),
      ...(query.category ? { primaryCategory: query.category } : {}),
      ...(countryCode ? { countryCode } : {}),
    } satisfies Prisma.NotablePersonWhereInput;

    const [people, total] = await this.prisma.$transaction([
      this.prisma.notablePerson.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          slug: true,
          displayName: true,
          instagramHandle: true,
          primaryCategory: true,
          occupation: true,
          followerCount: true,
          countryCode: true,
          imageUrl: true,
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
      this.prisma.notablePerson.count({ where }),
    ]);

    return {
      data: people.map(({ associations, _count, ...person }) => ({
        ...person,
        associationCount: _count.associations,
        verifiedAssociationCount: associations.length,
      })),
      meta: createPaginationMeta(page, pageSize, total),
    };
  }

  async findBySlug(slug: string) {
    const person = await this.prisma.notablePerson.findFirst({
      where: {
        slug,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
      select: {
        id: true,
        slug: true,
        displayName: true,
        instagramHandle: true,
        primaryCategory: true,
        occupation: true,
        followerCount: true,
        biography: true,
        countryCode: true,
        imageUrl: true,
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
            hotel: {
              select: {
                id: true,
                slug: true,
                name: true,
                countryCode: true,
                city: true,
                imageUrl: true,
                logoUrl: true,
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

    if (!person) {
      throw new NotFoundException(
        `Notable person with slug "${slug}" was not found`,
      );
    }

    const normalizedInstagramHandle = person.instagramHandle
      ?.trim()
      .replace(/^@/, '');
    const videos = normalizedInstagramHandle
      ? await this.prisma.video.findMany({
          where: {
            OR: [
              {
                instagramUsername: {
                  equals: normalizedInstagramHandle,
                  mode: 'insensitive',
                },
              },
              {
                instagramUsername: {
                  equals: `@${normalizedInstagramHandle}`,
                  mode: 'insensitive',
                },
              },
            ],
            publicationStatus: PublicationStatus.PUBLISHED,
          },
          orderBy: [{ publishedDate: 'desc' }, { id: 'asc' }],
          select: personVideoSelect,
        })
      : [];

    return {
      data: {
        ...person,
        videos: videos.map(({ destinations, hotels, ...video }) => ({
          ...video,
          destinations: destinations.map(({ destination }) => destination),
          hotels: hotels.map(({ hotel }) => hotel),
        })),
        associations: person.associations.map(
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
