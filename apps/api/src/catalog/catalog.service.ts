import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  access,
  lstat,
  mkdir,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import sharp from 'sharp';
import { Prisma } from '../generated/prisma/client';
import {
  AssociationType,
  ContentKind,
  ContentMediaType,
  DestinationType,
  PublicationStatus,
  VerificationStatus,
  VideoCategory,
} from '../generated/prisma/enums';
import { PrismaService } from '../database/prisma.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { CreateNotablePersonDto } from './dto/create-notable-person.dto';
import { sanitizeInstagramCrawlCurl } from './instagram-crawl-request';
import { CreateVideoDto } from './dto/create-video.dto';
import { ApplyFollowerUpdatesDto } from './dto/apply-follower-updates.dto';

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
    select: { destination: { select: destinationSelect } },
  },
  hotels: {
    select: { hotel: { select: { id: true, slug: true, name: true } } },
  },
} satisfies Prisma.VideoSelect;

const hotelAdminSelect = {
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
  publicationStatus: true,
} satisfies Prisma.HotelSelect;

const notablePersonAdminSelect = {
  id: true,
  slug: true,
  displayName: true,
  instagramHandle: true,
  primaryCategory: true,
  occupation: true,
  followerCount: true,
  followersUpdatedAt: true,
  biography: true,
  countryCode: true,
  imageUrl: true,
  instagramCrawlRequestUpdatedAt: true,
  publicationStatus: true,
} satisfies Prisma.NotablePersonSelect;

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
          select: hotelAdminSelect,
        }),
        this.prisma.notablePerson.findMany({
          orderBy: { displayName: 'asc' },
          select: notablePersonAdminSelect,
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
    await this.requireDestinationRules(dto);

    try {
      const destination = await this.prisma.$transaction(
        async (transaction) => {
          const { displayOrder, ...data } = dto;
          const created = await transaction.destination.create({
            data: {
              ...data,
              name: dto.name.trim(),
              description: dto.description ?? null,
              imageUrl: dto.imageUrl ?? null,
              parentProvinceId: dto.parentProvinceId ?? null,
              isFeatured: dto.isFeatured ?? false,
              displayOrder: null,
              primarySourceUrl: dto.primarySourceUrl ?? null,
              sourceType: dto.sourceType ?? null,
              notes: dto.notes ?? null,
            },
            select: { id: true },
          });
          const orderedIds = await this.destinationIdsInOrder(
            transaction,
            dto.type,
            created.id,
          );
          orderedIds.splice(
            this.destinationPosition(displayOrder, orderedIds.length) - 1,
            0,
            created.id,
          );
          await this.applyDestinationOrder(transaction, dto.type, orderedIds);
          return transaction.destination.findUniqueOrThrow({
            where: { id: created.id },
            select: destinationSelect,
          });
        },
      );
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
      const { crawlCurl, ...personData } = dto;
      const person = await this.prisma.notablePerson.create({
        data: {
          ...personData,
          displayName: dto.displayName.trim(),
          instagramHandle: dto.instagramHandle ?? null,
          occupation: dto.occupation ?? null,
          followerCount: dto.followerCount ?? null,
          biography: dto.biography ?? null,
          countryCode: dto.countryCode ?? null,
          imageUrl: dto.imageUrl ?? null,
          instagramCrawlRequest: crawlCurl
            ? sanitizeInstagramCrawlCurl(crawlCurl)
            : undefined,
          instagramCrawlRequestUpdatedAt: crawlCurl ? new Date() : undefined,
        },
        select: { id: true, slug: true, displayName: true },
      });
      return { data: person };
    } catch (error) {
      this.handleUniqueConflict(error, 'اسلاگ این چهره قبلاً ثبت شده است');
    }
  }
  async applyFollowerUpdates(dto: ApplyFollowerUpdatesDto) {
    const uniquePersonIds = new Set(
      dto.updates.map((update) => update.notablePersonId),
    );

    if (uniquePersonIds.size !== dto.updates.length) {
      throw new BadRequestException(
        'هر چهره در هر درخواست فقط یک بار می‌تواند ارسال شود',
      );
    }

    const people = await this.prisma.notablePerson.findMany({
      where: {
        id: {
          in: [...uniquePersonIds],
        },
      },
      select: {
        id: true,
      },
    });

    const existingIds = new Set(people.map((person) => person.id));

    const missingIds = [...uniquePersonIds].filter(
      (id) => !existingIds.has(id),
    );

    if (missingIds.length > 0) {
      throw new BadRequestException(`چهره پیدا نشد: ${missingIds.join(', ')}`);
    }

    const result = await this.prisma.$transaction(async (transaction) => {
      let updatedPeople = 0;
      let snapshots = 0;

      for (const update of dto.updates) {
        const capturedAt = new Date(update.capturedAt);

        const snapshotDate = new Date(
          Date.UTC(
            capturedAt.getUTCFullYear(),
            capturedAt.getUTCMonth(),
            capturedAt.getUTCDate(),
          ),
        );

        await transaction.notablePerson.update({
          where: {
            id: update.notablePersonId,
          },
          data: {
            followerCount: update.followerCount,
            followersUpdatedAt: capturedAt,
          },
        });

        updatedPeople += 1;

        await transaction.followerSnapshot.upsert({
          where: {
            notablePersonId_snapshotDate: {
              notablePersonId: update.notablePersonId,
              snapshotDate,
            },
          },
          create: {
            notablePersonId: update.notablePersonId,
            followerCount: update.followerCount,
            snapshotDate,
            capturedAt,
          },
          update: {
            followerCount: update.followerCount,
            capturedAt,
          },
        });

        snapshots += 1;
      }

      return {
        updatedPeople,
        snapshots,
      };
    });

    return {
      data: {
        received: dto.updates.length,
        ...result,
      },
    };
  }

  async updateDestination(id: string, dto: CreateDestinationDto) {
    await this.requireDestinationRules(dto);
    const existing = await this.prisma.destination.findUnique({
      where: { id },
      select: { id: true, type: true, _count: { select: { cities: true } } },
    });
    if (!existing) throw new NotFoundException('مقصد پیدا نشد');
    if (
      existing.type === DestinationType.PROVINCE &&
      dto.type !== DestinationType.PROVINCE &&
      existing._count.cities > 0
    ) {
      throw new BadRequestException(
        'استان دارای شهر را نمی‌توان به شهر تبدیل کرد',
      );
    }

    try {
      const destination = await this.prisma.$transaction(
        async (transaction) => {
          const { displayOrder, ...data } = dto;
          await transaction.destination.update({
            where: { id },
            data: {
              ...data,
              name: dto.name.trim(),
              description: dto.description ?? null,
              imageUrl: dto.imageUrl ?? null,
              parentProvinceId: dto.parentProvinceId ?? null,
              isFeatured: dto.isFeatured ?? false,
              displayOrder: null,
              primarySourceUrl: dto.primarySourceUrl ?? null,
              sourceType: dto.sourceType ?? null,
              notes: dto.notes ?? null,
            },
          });
          if (existing.type !== dto.type) {
            const previousIds = await this.destinationIdsInOrder(
              transaction,
              existing.type,
              id,
            );
            await this.applyDestinationOrder(
              transaction,
              existing.type,
              previousIds,
            );
          }
          const orderedIds = await this.destinationIdsInOrder(
            transaction,
            dto.type,
            id,
          );
          orderedIds.splice(
            this.destinationPosition(displayOrder, orderedIds.length) - 1,
            0,
            id,
          );
          await this.applyDestinationOrder(transaction, dto.type, orderedIds);
          return transaction.destination.findUniqueOrThrow({
            where: { id },
            select: destinationSelect,
          });
        },
      );
      return { data: destination };
    } catch (error) {
      this.handleUniqueConflict(
        error,
        'اسلاگ یا ترتیب نمایش این مقصد تکراری است',
      );
    }
  }

  async updateHotel(id: string, dto: CreateHotelDto) {
    const existing = await this.prisma.hotel.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('هتل پیدا نشد');

    try {
      const hotel = await this.prisma.hotel.update({
        where: { id },
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
        select: hotelAdminSelect,
      });
      return { data: hotel };
    } catch (error) {
      this.handleUniqueConflict(error, 'اسلاگ این هتل قبلاً ثبت شده است');
    }
  }

  async updateNotablePerson(id: string, dto: CreateNotablePersonDto) {
    const existing = await this.prisma.notablePerson.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('چهره پیدا نشد');

    if (dto.instagramHandle) {
      const duplicate = await this.prisma.notablePerson.findFirst({
        where: {
          id: { not: id },
          instagramHandle: { equals: dto.instagramHandle, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (duplicate) throw new ConflictException('آیدی اینستاگرام تکراری است');
    }

    try {
      const { crawlCurl, ...personData } = dto;
      const person = await this.prisma.notablePerson.update({
        where: { id },
        data: {
          ...personData,
          displayName: dto.displayName.trim(),
          instagramHandle: dto.instagramHandle ?? null,
          occupation: dto.occupation ?? null,
          followerCount: dto.followerCount ?? null,
          biography: dto.biography ?? null,
          countryCode: dto.countryCode ?? null,
          imageUrl: dto.imageUrl ?? null,
          instagramCrawlRequest: crawlCurl
            ? sanitizeInstagramCrawlCurl(crawlCurl)
            : undefined,
          instagramCrawlRequestUpdatedAt: crawlCurl ? new Date() : undefined,
        },
        select: notablePersonAdminSelect,
      });
      return { data: person };
    } catch (error) {
      this.handleUniqueConflict(error, 'اسلاگ این چهره قبلاً ثبت شده است');
    }
  }

  async uploadMedia(
    kind: string,
    slug: string,
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
  ) {
    if (!file) throw new BadRequestException('یک فایل برای آپلود انتخاب کنید');
    const nestedContentImage =
      kind === 'TRAVEL_CONTENT_IMAGE' || kind === 'HOTEL_CONTENT_IMAGE';
    const validSlug = nestedContentImage
      ? /^[a-z0-9]+(?:[._-][a-z0-9]+)*\/[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(
          slug,
        )
      : /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
    if (!validSlug)
      throw new BadRequestException('ابتدا Slug معتبر را وارد کنید');
    const mediaPaths: Record<string, string> = {
      HOTEL_IMAGE: `images/hotels/${slug}.webp`,
      HOTEL_LOGO: `images/hotels/${slug}-logo.webp`,
      PERSON_IMAGE: `images/people/${slug}.webp`,
      CITY_IMAGE: `images/cities/${slug}.webp`,
      PROVINCE_IMAGE: `images/provinces/${slug}.webp`,
      TRAVEL_CONTENT_IMAGE: `travel-videos/${slug}.webp`,
      HOTEL_CONTENT_IMAGE: `hotel-videos/${slug}.webp`,
    };
    const relativePath = mediaPaths[kind];
    if (!relativePath) throw new BadRequestException('نوع رسانه معتبر نیست');

    const publicRootCandidates = [
      resolve(process.cwd(), '../web/public'),
      resolve(process.cwd(), 'apps/web/public'),
    ];
    let publicRoot: string | null = null;
    for (const candidate of publicRootCandidates) {
      if (
        await access(candidate)
          .then(() => true)
          .catch(() => false)
      ) {
        publicRoot = candidate;
        break;
      }
    }
    if (!publicRoot) {
      throw new BadRequestException('پوشه public وب پیدا نشد');
    }
    const targetPath = resolve(publicRoot, relativePath);
    if (!targetPath.startsWith(`${publicRoot}${sep}`)) {
      throw new BadRequestException('مسیر رسانه معتبر نیست');
    }
    await mkdir(dirname(targetPath), { recursive: true });
    const existing = await lstat(targetPath).catch(() => null);
    if (existing?.isSymbolicLink()) {
      throw new BadRequestException('مسیر رسانه به پیوند نمادین اشاره می‌کند');
    }

    let webpBuffer: Buffer;
    try {
      webpBuffer = await sharp(file.buffer, {
        failOn: 'error',
        limitInputPixels: 80_000_000,
      })
        .rotate()
        .webp({ quality: 88, effort: 4 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'این تصویر قابل پردازش نیست؛ یک فایل PNG، JPG، WebP یا HEIC سالم انتخاب کنید',
      );
    }

    const temporaryPath = `${targetPath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, webpBuffer, { flag: 'wx' });
      await rename(temporaryPath, targetPath);
    } finally {
      await unlink(temporaryPath).catch(() => undefined);
    }
    return { data: { path: `/${relativePath}` } };
  }

  async deleteDestination(id: string) {
    const destination = await this.prisma.destination.findUnique({
      where: { id },
      select: { id: true, _count: { select: { cities: true } } },
    });
    if (!destination) throw new NotFoundException('مقصد پیدا نشد');
    if (destination._count.cities > 0) {
      throw new BadRequestException(
        'ابتدا شهرهای این استان را حذف یا منتقل کنید',
      );
    }
    await this.prisma.destination.delete({ where: { id } });
    return { data: { success: true } };
  }

  async deleteHotel(id: string) {
    const result = await this.prisma.hotel.deleteMany({ where: { id } });
    if (result.count === 0) throw new NotFoundException('هتل پیدا نشد');
    return { data: { success: true } };
  }

  async deleteNotablePerson(id: string) {
    const result = await this.prisma.notablePerson.deleteMany({
      where: { id },
    });
    if (result.count === 0) throw new NotFoundException('چهره پیدا نشد');
    return { data: { success: true } };
  }

  async deleteVideo(id: string) {
    const result = await this.prisma.video.deleteMany({ where: { id } });
    if (result.count === 0) throw new NotFoundException('ویدیو پیدا نشد');
    return { data: { success: true } };
  }

  async createVideo(dto: CreateVideoDto) {
    const person = await this.prisma.notablePerson.findFirst({
      where: {
        instagramHandle: { equals: dto.instagramUsername, mode: 'insensitive' },
      },
      select: { id: true, slug: true, displayName: true },
    });
    if (!person) {
      throw new BadRequestException(
        'ابتدا چهره‌ای با این آیدی اینستاگرام ثبت کنید',
      );
    }

    const uniqueDestinationIds = [...new Set(dto.destinationIds)];
    const uniqueHotelIds = [...new Set(dto.hotelIds)];
    if (
      dto.videoCategory === VideoCategory.TRAVEL &&
      uniqueDestinationIds.length === 0
    ) {
      throw new BadRequestException('برای محتوای سفر حداقل یک مقصد لازم است');
    }
    if (
      dto.videoCategory === VideoCategory.HOTEL &&
      uniqueHotelIds.length === 0
    ) {
      throw new BadRequestException('برای محتوای هتل حداقل یک هتل لازم است');
    }

    const [destinationCount, hotels] = await this.prisma.$transaction([
      this.prisma.destination.count({
        where: { id: { in: uniqueDestinationIds } },
      }),
      this.prisma.hotel.findMany({
        where: { id: { in: uniqueHotelIds } },
        select: { id: true, slug: true, name: true },
      }),
    ]);
    if (destinationCount !== uniqueDestinationIds.length) {
      throw new BadRequestException('یک یا چند مقصد معتبر نیستند');
    }
    if (hotels.length !== uniqueHotelIds.length) {
      throw new BadRequestException('یک یا چند هتل معتبر نیستند');
    }

    const contentKind = dto.contentKind ?? ContentKind.VIDEO;
    const mediaItems = dto.mediaItems?.map((item, index) => ({
      displayOrder: index + 1,
      mediaType: item.mediaType,
      mediaUrl: item.mediaUrl,
      thumbnailUrl: item.thumbnailUrl ?? null,
    })) ?? [
      {
        displayOrder: 1,
        mediaType: ContentMediaType.VIDEO,
        mediaUrl: dto.mediaUrl,
        thumbnailUrl: dto.thumbnailUrl,
      },
    ];
    this.requireContentMediaRules(contentKind, mediaItems);
    const primaryMedia = mediaItems[0];

    try {
      const video = await this.prisma.$transaction(async (transaction) => {
        const createdVideo = await transaction.video.create({
          data: {
            id: dto.id,
            videoCategory: dto.videoCategory,
            contentKind,
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
            mediaUrl: primaryMedia.mediaUrl,
            thumbnailUrl: primaryMedia.thumbnailUrl ?? primaryMedia.mediaUrl,
            publicationStatus: dto.publicationStatus,
            mediaItems: { create: mediaItems },
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

        if (
          uniqueHotelIds.length > 0 &&
          dto.publicationStatus === PublicationStatus.PUBLISHED &&
          dto.verificationStatus !== VerificationStatus.REJECTED
        ) {
          const existingAssociations =
            await transaction.hotelAssociation.findMany({
              where: {
                notablePersonId: person.id,
                hotelId: { in: uniqueHotelIds },
              },
              select: { hotelId: true },
            });
          const existingHotelIds = new Set(
            existingAssociations.map(({ hotelId }) => hotelId),
          );

          for (const hotel of hotels) {
            if (existingHotelIds.has(hotel.id)) continue;
            await transaction.hotelAssociation.create({
              data: {
                referenceKey: associationReferenceKey(
                  dto.id,
                  person.slug,
                  hotel.slug,
                ),
                hotelId: hotel.id,
                notablePersonId: person.id,
                type: AssociationType.VISITED,
                summary: `ارتباط ${person.displayName} با ${hotel.name} از طریق ویدیوی «${dto.title.trim()}» ثبت شده و در انتظار بررسی است.`,
                verificationStatus: VerificationStatus.PENDING,
              },
            });
          }
        }

        return createdVideo;
      });
      return { data: flattenVideo(video) };
    } catch (error) {
      this.handleUniqueConflict(error, 'شناسه این محتوا تکراری است');
    }
  }

  async updateVideo(id: string, dto: CreateVideoDto) {
    if (dto.id !== id) {
      throw new BadRequestException(
        'شناسه اصلی محتوا هنگام ویرایش قابل تغییر نیست',
      );
    }

    const person = await this.prisma.notablePerson.findFirst({
      where: {
        instagramHandle: { equals: dto.instagramUsername, mode: 'insensitive' },
      },
      select: { id: true, slug: true, displayName: true },
    });
    if (!person) {
      throw new BadRequestException(
        'ابتدا چهره‌ای با این آیدی اینستاگرام ثبت کنید',
      );
    }

    const uniqueDestinationIds = [...new Set(dto.destinationIds)];
    const uniqueHotelIds = [...new Set(dto.hotelIds)];
    if (
      dto.videoCategory === VideoCategory.TRAVEL &&
      uniqueDestinationIds.length === 0
    ) {
      throw new BadRequestException('برای محتوای سفر حداقل یک مقصد لازم است');
    }
    if (
      dto.videoCategory === VideoCategory.HOTEL &&
      uniqueHotelIds.length === 0
    ) {
      throw new BadRequestException('برای محتوای هتل حداقل یک هتل لازم است');
    }

    const [destinationCount, hotels] = await this.prisma.$transaction([
      this.prisma.destination.count({
        where: { id: { in: uniqueDestinationIds } },
      }),
      this.prisma.hotel.findMany({
        where: { id: { in: uniqueHotelIds } },
        select: { id: true, slug: true, name: true },
      }),
    ]);
    if (destinationCount !== uniqueDestinationIds.length) {
      throw new BadRequestException('یک یا چند مقصد معتبر نیستند');
    }
    if (hotels.length !== uniqueHotelIds.length) {
      throw new BadRequestException('یک یا چند هتل معتبر نیستند');
    }

    const contentKind = dto.contentKind ?? ContentKind.VIDEO;
    const mediaItems = dto.mediaItems?.map((item, index) => ({
      displayOrder: index + 1,
      mediaType: item.mediaType,
      mediaUrl: item.mediaUrl,
      thumbnailUrl: item.thumbnailUrl ?? null,
    })) ?? [
      {
        displayOrder: 1,
        mediaType: ContentMediaType.VIDEO,
        mediaUrl: dto.mediaUrl,
        thumbnailUrl: dto.thumbnailUrl,
      },
    ];
    this.requireContentMediaRules(contentKind, mediaItems);
    const primaryMedia = mediaItems[0];

    try {
      const video = await this.prisma.$transaction(async (transaction) => {
        const updatedVideo = await transaction.video.update({
          where: { id },
          data: {
            videoCategory: dto.videoCategory,
            contentKind,
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
            mediaUrl: primaryMedia.mediaUrl,
            thumbnailUrl: primaryMedia.thumbnailUrl ?? primaryMedia.mediaUrl,
            publicationStatus: dto.publicationStatus,
            mediaItems: {
              deleteMany: {},
              create: mediaItems,
            },
            destinations: {
              deleteMany: {},
              create: uniqueDestinationIds.map((destinationId) => ({
                destinationId,
              })),
            },
            hotels: {
              deleteMany: {},
              create: uniqueHotelIds.map((hotelId) => ({ hotelId })),
            },
          },
          select: videoSelect,
        });

        if (
          uniqueHotelIds.length > 0 &&
          dto.publicationStatus === PublicationStatus.PUBLISHED &&
          dto.verificationStatus !== VerificationStatus.REJECTED
        ) {
          const existingAssociations =
            await transaction.hotelAssociation.findMany({
              where: {
                notablePersonId: person.id,
                hotelId: { in: uniqueHotelIds },
              },
              select: { hotelId: true },
            });
          const existingHotelIds = new Set(
            existingAssociations.map(({ hotelId }) => hotelId),
          );

          for (const hotel of hotels) {
            if (existingHotelIds.has(hotel.id)) continue;
            await transaction.hotelAssociation.create({
              data: {
                referenceKey: associationReferenceKey(
                  id,
                  person.slug,
                  hotel.slug,
                ),
                hotelId: hotel.id,
                notablePersonId: person.id,
                type: AssociationType.VISITED,
                summary: `ارتباط ${person.displayName} با ${hotel.name} از طریق ویدیوی «${dto.title.trim()}» ثبت شده و در انتظار بررسی است.`,
                verificationStatus: VerificationStatus.PENDING,
              },
            });
          }
        }

        return updatedVideo;
      });
      return { data: flattenVideo(video) };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('محتوا پیدا نشد');
      }
      this.handleUniqueConflict(error, 'شناسه این محتوا تکراری است');
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
            mediaItems: { orderBy: { displayOrder: 'asc' } },
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
        videoCategory: video.videoCategory,
        contentKind: video.contentKind,
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
        mediaItems: video.mediaItems.map((item) => ({
          mediaType: item.mediaType,
          mediaUrl: item.mediaUrl,
          thumbnailUrl: item.thumbnailUrl,
        })),
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

  private requireContentMediaRules(
    contentKind: ContentKind,
    mediaItems: Array<{
      mediaType: ContentMediaType;
      mediaUrl: string;
    }>,
  ) {
    if (mediaItems.length === 0) {
      throw new BadRequestException('حداقل یک فایل رسانه لازم است');
    }
    if (
      contentKind === ContentKind.VIDEO &&
      (mediaItems.length !== 1 ||
        mediaItems[0].mediaType !== ContentMediaType.VIDEO)
    ) {
      throw new BadRequestException(
        'محتوای ویدیویی باید یک فایل ویدیو داشته باشد',
      );
    }
  }

  private async requireDestinationRules(dto: CreateDestinationDto) {
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
  }

  private destinationPosition(
    requested: number | undefined,
    itemCount: number,
  ) {
    return Math.min(Math.max(requested ?? itemCount + 1, 1), itemCount + 1);
  }

  private async destinationIdsInOrder(
    transaction: Prisma.TransactionClient,
    type: DestinationType,
    excludedId?: string,
  ) {
    const destinations = await transaction.destination.findMany({
      where: { type, ...(excludedId ? { id: { not: excludedId } } : {}) },
      select: { id: true, name: true, displayOrder: true },
    });
    return destinations
      .sort(
        (left, right) =>
          (left.displayOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.displayOrder ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name, 'fa'),
      )
      .map(({ id }) => id);
  }

  private async applyDestinationOrder(
    transaction: Prisma.TransactionClient,
    type: DestinationType,
    orderedIds: string[],
  ) {
    await transaction.destination.updateMany({
      where: { type },
      data: { displayOrder: null },
    });
    for (const [index, destinationId] of orderedIds.entries()) {
      await transaction.destination.update({
        where: { id: destinationId },
        data: { displayOrder: index + 1 },
      });
    }
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

function associationReferenceKey(
  videoId: string,
  personSlug: string,
  hotelSlug: string,
): string {
  return `video-${personSlug}-${hotelSlug}-${videoId}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}
