import { Injectable, NotFoundException } from '@nestjs/common';
import { createPaginationMeta, PaginatedResponse } from '../common/pagination';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import {
  PublicationStatus,
  VerificationStatus,
} from '../generated/prisma/enums';
import { NotablePersonQueryDto } from './dto/notable-person-query.dto';

const publicAssociationWhere = {
  verificationStatus: VerificationStatus.VERIFIED,
  hotel: {
    publicationStatus: PublicationStatus.PUBLISHED,
  },
  evidence: {
    some: {},
  },
} satisfies Prisma.HotelAssociationWhereInput;

type NotablePersonListItem = {
  id: string;
  slug: string;
  displayName: string;
  primaryCategory: string;
  occupation: string | null;
  countryCode: string | null;
  imageUrl: string | null;
  associationCount: number;
};

@Injectable()
export class NotablePeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: NotablePersonQueryDto,
  ): Promise<PaginatedResponse<NotablePersonListItem>> {
    const { page, pageSize } = query;
    const search = query.query?.trim();
    const countryCode = query.countryCode?.toUpperCase();

    const where = {
      publicationStatus: PublicationStatus.PUBLISHED,
      associations: { some: publicAssociationWhere },
      ...(search
        ? {
            OR: [
              {
                displayName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                occupation: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
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
        orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          slug: true,
          displayName: true,
          primaryCategory: true,
          occupation: true,
          countryCode: true,
          imageUrl: true,
          _count: {
            select: {
              associations: { where: publicAssociationWhere },
            },
          },
        },
      }),
      this.prisma.notablePerson.count({ where }),
    ]);

    return {
      data: people.map(({ _count, ...person }) => ({
        ...person,
        associationCount: _count.associations,
      })),
      meta: createPaginationMeta(page, pageSize, total),
    };
  }

  async findBySlug(slug: string) {
    const person = await this.prisma.notablePerson.findFirst({
      where: {
        slug,
        publicationStatus: PublicationStatus.PUBLISHED,
        associations: { some: publicAssociationWhere },
      },
      select: {
        id: true,
        slug: true,
        displayName: true,
        primaryCategory: true,
        occupation: true,
        biography: true,
        countryCode: true,
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
            hotel: {
              select: {
                id: true,
                slug: true,
                name: true,
                countryCode: true,
                city: true,
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

    if (!person) {
      throw new NotFoundException(
        `Notable person with slug "${slug}" was not found`,
      );
    }

    return {
      data: {
        ...person,
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
