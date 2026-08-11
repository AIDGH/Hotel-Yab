import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { DestinationType, PublicationStatus } from '../generated/prisma/enums';
import { PrismaService } from '../database/prisma.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { CreateNotablePersonDto } from './dto/create-notable-person.dto';
import { CreateVideoDto } from './dto/create-video.dto';

const destinationSelect = {
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
} satisfies Prisma.DestinationSelect;

const videoSelect = {
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
  destinations: {
    select: { destination: { select: destinationSelect } },
  },
  hotels: {
    select: { hotel: { select: { id: true, slug: true, name: true } } },
  },
} satisfies Prisma.VideoSelect;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminBootstrap() {
    const [destinations, hotels, notablePeople, videos] =
      await this.prisma.$transaction([
        this.prisma.destination.findMany({
          orderBy: [{ type: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
          select: destinationSelect,
        }),
        this.prisma.hotel.findMany({
          orderBy: { name: 'asc' },
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            publicationStatus: true,
          },
        }),
        this.prisma.notablePerson.findMany({
          orderBy: { displayName: 'asc' },
          select: {
            id: true,
            slug: true,
            displayName: true,
            instagramHandle: true,
            primaryCategory: true,
            publicationStatus: true,
          },
        }),
        this.prisma.video.findMany({
          orderBy: { createdAt: 'desc' },
          select: videoSelect,
        }),
      ]);

    return {
      data: {
        destinations,
        hotels,
        notablePeople,
        videos: videos.map(flattenVideo),
      },
    };
  }

  async createDestination(dto: CreateDestinationDto) {
    if (dto.type === DestinationType.CITY && !dto.parentProvinceId) {
      throw new BadRequestException('برای شهر باید استان والد انتخاب شود');
    }
    if (dto.type === DestinationType.PROVINCE && dto.parentProvinceId) {
      throw new BadRequestException('استان نمی‌تواند استان والد داشته باشد');
    }
    if (dto.parentProvinceId) {
      const province = await this.prisma.destination.findFirst({
        where: { id: dto.parentProvinceId, type: DestinationType.PROVINCE },
        select: { id: true },
      });
      if (!province) throw new BadRequestException('استان والد معتبر نیست');
    }

    try {
      const destination = await this.prisma.destination.create({
        data: {
          ...dto,
          name: dto.name.trim(),
          description: dto.description ?? null,
          imageUrl: dto.imageUrl ?? null,
          parentProvinceId: dto.parentProvinceId ?? null,
          isFeatured: dto.isFeatured ?? false,
          displayOrder: dto.displayOrder ?? null,
          primarySourceUrl: dto.primarySourceUrl ?? null,
          sourceType: dto.sourceType ?? null,
          notes: dto.notes ?? null,
        },
        select: destinationSelect,
      });
      return { data: destination };
    } catch (error) {
      this.handleUniqueConflict(
        error,
        'اسلاگ یا ترتیب نمایش این مقصد تکراری است',
      );
    }
  }

  async createHotel(dto: CreateHotelDto) {
    try {
      const hotel = await this.prisma.hotel.create({
        data: {
          ...dto,
          name: dto.name.trim(),
          city: dto.city.trim(),
          description: dto.description ?? null,
          address: dto.address ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          websiteUrl: dto.websiteUrl ?? null,
          imageUrl: dto.imageUrl ?? null,
          logoUrl: dto.logoUrl ?? null,
          starRating: dto.starRating ?? null,
        },
        select: { id: true, slug: true, name: true },
      });
      return { data: hotel };
    } catch (error) {
      this.handleUniqueConflict(error, 'اسلاگ این هتل قبلاً ثبت شده است');
    }
  }

  async createNotablePerson(dto: CreateNotablePersonDto) {
    if (dto.instagramHandle) {
      const duplicate = await this.prisma.notablePerson.findFirst({
        where: {
          instagramHandle: { equals: dto.instagramHandle, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (duplicate) throw new ConflictException('آیدی اینستاگرام تکراری است');
    }
    try {
      const person = await this.prisma.notablePerson.create({
        data: {
          ...dto,
          displayName: dto.displayName.trim(),
          instagramHandle: dto.instagramHandle ?? null,
          occupation: dto.occupation ?? null,
          followerCount: dto.followerCount ?? null,
          biography: dto.biography ?? null,
          countryCode: dto.countryCode ?? null,
          imageUrl: dto.imageUrl ?? null,
        },
        select: { id: true, slug: true, displayName: true },
      });
      return { data: person };
    } catch (error) {
      this.handleUniqueConflict(error, 'اسلاگ این چهره قبلاً ثبت شده است');
    }
  }

  async createVideo(dto: CreateVideoDto) {
    const person = await this.prisma.notablePerson.findFirst({
      where: {
        instagramHandle: { equals: dto.instagramUsername, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (!person) {
      throw new BadRequestException(
        'ابتدا چهره‌ای با این آیدی اینستاگرام ثبت کنید',
      );
    }

    const uniqueDestinationIds = [...new Set(dto.destinationIds)];
    const uniqueHotelIds = [...new Set(dto.hotelIds ?? [])];
    const [destinationCount, hotelCount] = await this.prisma.$transaction([
      this.prisma.destination.count({
        where: { id: { in: uniqueDestinationIds } },
      }),
      this.prisma.hotel.count({ where: { id: { in: uniqueHotelIds } } }),
    ]);
    if (destinationCount !== uniqueDestinationIds.length) {
      throw new BadRequestException('یک یا چند مقصد معتبر نیستند');
    }
    if (hotelCount !== uniqueHotelIds.length) {
      throw new BadRequestException('یک یا چند هتل معتبر نیستند');
    }

    try {
      const video = await this.prisma.video.create({
        data: {
          id: dto.id,
          instagramUsername: dto.instagramUsername,
          platform: dto.platform,
          personCategory: dto.personCategory ?? null,
          contentType: dto.contentType,
          sourceUrl: dto.sourceUrl,
          title: dto.title.trim(),
          placeName: dto.placeName.trim(),
          placeType: dto.placeType,
          publishedDate: dto.publishedDate ?? null,
          captionSummary: dto.captionSummary ?? null,
          evidenceType: dto.evidenceType,
          verificationStatus: dto.verificationStatus,
          notes: dto.notes ?? null,
          mediaUrl: dto.mediaUrl,
          thumbnailUrl: dto.thumbnailUrl,
          publicationStatus: dto.publicationStatus,
          destinations: {
            create: uniqueDestinationIds.map((destinationId) => ({
              destinationId,
            })),
          },
          hotels: {
            create: uniqueHotelIds.map((hotelId) => ({ hotelId })),
          },
        },
        select: videoSelect,
      });
      return { data: flattenVideo(video) };
    } catch (error) {
      this.handleUniqueConflict(
        error,
        'شناسه یا لینک منبع این ویدیو تکراری است',
      );
    }
  }

  async listPublicDestinations() {
    const destinations = await this.prisma.destination.findMany({
      where: { publicationStatus: PublicationStatus.PUBLISHED },
      orderBy: [{ type: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
      select: destinationSelect,
    });
    return { data: destinations };
  }

  async getPublicDestination(type: DestinationType, slug: string) {
    const destination = await this.prisma.destination.findFirst({
      where: { type, slug, publicationStatus: PublicationStatus.PUBLISHED },
      select: destinationSelect,
    });
    if (!destination) throw new NotFoundException('مقصد پیدا نشد');
    return { data: destination };
  }

  async listPublicVideos() {
    const videos = await this.prisma.video.findMany({
      where: { publicationStatus: PublicationStatus.PUBLISHED },
      orderBy: { id: 'asc' },
      select: videoSelect,
    });
    return { data: videos.map(flattenVideo) };
  }

  async exportImportDataset() {
    const [hotels, notablePeople, sources, associations, destinations, videos] =
      await this.prisma.$transaction([
        this.prisma.hotel.findMany({ orderBy: { slug: 'asc' } }),
        this.prisma.notablePerson.findMany({ orderBy: { slug: 'asc' } }),
        this.prisma.source.findMany({ orderBy: { url: 'asc' } }),
        this.prisma.hotelAssociation.findMany({
          orderBy: { referenceKey: 'asc' },
          include: {
            hotel: { select: { slug: true } },
            notablePerson: { select: { slug: true } },
            evidence: { include: { source: { select: { url: true } } } },
          },
        }),
        this.prisma.destination.findMany({
          orderBy: [{ type: 'desc' }, { displayOrder: 'asc' }, { slug: 'asc' }],
          include: { parentProvince: { select: { slug: true } } },
        }),
        this.prisma.video.findMany({
          orderBy: { id: 'asc' },
          include: {
            destinations: { include: { destination: true } },
            hotels: { include: { hotel: { select: { slug: true } } } },
          },
        }),
      ]);

    return {
      hotels: hotels.map((hotel) => ({
        slug: hotel.slug,
        name: hotel.name,
        description: hotel.description,
        countryCode: hotel.countryCode,
        city: hotel.city,
        address: hotel.address,
        latitude: hotel.latitude === null ? null : Number(hotel.latitude),
        longitude: hotel.longitude === null ? null : Number(hotel.longitude),
        websiteUrl: hotel.websiteUrl,
        imageUrl: hotel.imageUrl,
        logoUrl: hotel.logoUrl,
        starRating: hotel.starRating,
        publicationStatus: hotel.publicationStatus,
      })),
      notablePeople: notablePeople.map((person) => ({
        slug: person.slug,
        displayName: person.displayName,
        instagramHandle: person.instagramHandle,
        primaryCategory: person.primaryCategory,
        occupation: person.occupation,
        followerCount: person.followerCount,
        biography: person.biography,
        countryCode: person.countryCode,
        imageUrl: person.imageUrl,
        publicationStatus: person.publicationStatus,
      })),
      sources: sources.map((source) => ({
        url: source.url,
        type: source.type,
        title: source.title,
        publisher: source.publisher,
        author: source.author,
        publishedAt: source.publishedAt?.toISOString() ?? null,
        archivedUrl: source.archivedUrl,
      })),
      associations: associations.map((association) => ({
        referenceKey: association.referenceKey,
        hotelSlug: association.hotel.slug,
        notablePersonSlug: association.notablePerson.slug,
        type: association.type,
        summary: association.summary,
        occurredAt: association.occurredAt?.toISOString() ?? null,
        verificationStatus: association.verificationStatus,
        verificationNotes: association.verificationNotes,
        ...(association.verificationStatus === 'VERIFIED'
          ? { verifiedAt: association.verifiedAt?.toISOString() }
          : {}),
        evidence: association.evidence.map((link) => ({
          sourceUrl: link.source.url,
          isPrimary: link.isPrimary,
          note: link.note,
        })),
      })),
      destinations: destinations.map((destination) => ({
        type: destination.type,
        slug: destination.slug,
        name: destination.name,
        description: destination.description,
        imageUrl: destination.imageUrl,
        parentProvinceSlug: destination.parentProvince?.slug ?? null,
        isFeatured: destination.isFeatured,
        displayOrder: destination.displayOrder,
        primarySourceUrl: destination.primarySourceUrl,
        sourceType: destination.sourceType,
        notes: destination.notes,
        publicationStatus: destination.publicationStatus,
      })),
      videos: videos.map((video) => ({
        id: video.id,
        instagramUsername: video.instagramUsername,
        platform: video.platform,
        personCategory: video.personCategory,
        contentType: video.contentType,
        sourceUrl: video.sourceUrl,
        title: video.title,
        placeName: video.placeName,
        placeType: video.placeType,
        publishedDate: video.publishedDate,
        captionSummary: video.captionSummary,
        evidenceType: video.evidenceType,
        verificationStatus: video.verificationStatus,
        notes: video.notes,
        mediaUrl: video.mediaUrl,
        thumbnailUrl: video.thumbnailUrl,
        publicationStatus: video.publicationStatus,
        destinationRefs: video.destinations.map(({ destination }) => ({
          type: destination.type,
          slug: destination.slug,
        })),
        hotelSlugs: video.hotels.map(({ hotel }) => hotel.slug),
      })),
    };
  }

  private handleUniqueConflict(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
    throw error;
  }
}

function flattenVideo<
  T extends {
    destinations: Array<{ destination: unknown }>;
    hotels: Array<{ hotel: unknown }>;
  },
>(video: T) {
  const { destinations, hotels, ...data } = video;
  return {
    ...data,
    destinations: destinations.map(({ destination }) => destination),
    hotels: hotels.map(({ hotel }) => hotel),
  };
}
