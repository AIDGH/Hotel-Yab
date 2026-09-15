import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'node:child_process';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { createWriteStream } from 'node:fs';
import {
  access,
  mkdir,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform, type Readable } from 'node:stream';
import { EnvironmentVariables } from '../config/environment';
import { Prisma } from '../generated/prisma/client';
import {
  CrawlReviewBatchStatus,
  CrawlReviewItemStatus,
  CrawlReviewProcessingStatus,
  DestinationType,
  UserRole,
} from '../generated/prisma/enums';
import { PrismaService } from '../database/prisma.service';
import { CrawlReviewQueryDto } from './dto/crawl-review-query.dto';
import { UpdateCrawlReviewItemDto } from './dto/update-crawl-review-item.dto';

type Candidate = Record<string, unknown>;

type UploadedReviewBatch = {
  id: string;
  status: CrawlReviewBatchStatus;
  instagramUsername: string;
  totalItems: number;
  skippedExisting: number;
};

const destinationSelect = {
  id: true,
  type: true,
  slug: true,
  name: true,
  parentProvinceId: true,
} satisfies Prisma.DestinationSelect;

const hotelSelect = {
  id: true,
  slug: true,
  name: true,
  city: true,
} satisfies Prisma.HotelSelect;

@Injectable()
export class CrawlReviewsService implements OnModuleInit {
  private readonly logger = new Logger(CrawlReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onModuleInit() {
    const interrupted = await this.prisma.crawlReviewBatch.updateMany({
      where: { processingStatus: CrawlReviewProcessingStatus.RUNNING },
      data: {
        processingStatus: CrawlReviewProcessingStatus.FAILED,
        processingFinishedAt: new Date(),
        processingLog:
          'پردازش به‌دلیل راه‌اندازی مجدد سرویس متوقف شد؛ دوباره اجرا کنید.',
      },
    });
    if (interrupted.count > 0) {
      this.logger.warn(
        `Marked ${interrupted.count} interrupted crawl processing job(s) as failed`,
      );
    }
  }

  async getBootstrap() {
    const [destinations, hotels, notablePeople, batches] =
      await this.prisma.$transaction([
        this.prisma.destination.findMany({
          orderBy: [{ type: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
          select: destinationSelect,
        }),
        this.prisma.hotel.findMany({
          orderBy: { name: 'asc' },
          select: hotelSelect,
        }),
        this.prisma.notablePerson.findMany({
          where: { instagramHandle: { not: null } },
          orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            slug: true,
            displayName: true,
            instagramHandle: true,
            imageUrl: true,
          },
        }),
        this.prisma.crawlReviewBatch.findMany({
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            instagramUsername: true,
            sourceFilename: true,
            status: true,
            processingStatus: true,
            processingStartedAt: true,
            processingFinishedAt: true,
            reviewedAt: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { items: true } },
          },
        }),
      ]);
    const groupedCounts = await this.prisma.crawlReviewItem.groupBy({
      by: ['batchId', 'reviewStatus'],
      orderBy: [{ batchId: 'asc' }, { reviewStatus: 'asc' }],
      _count: { id: true },
    });

    const counts = new Map<
      string,
      Record<
        (typeof CrawlReviewItemStatus)[keyof typeof CrawlReviewItemStatus],
        number
      >
    >();
    for (const row of groupedCounts) {
      const current = counts.get(row.batchId) ?? {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
      };
      current[row.reviewStatus] = aggregateCount(row._count);
      counts.set(row.batchId, current);
    }

    return {
      data: {
        destinations,
        hotels,
        notablePeople,
        batches: batches.map(({ _count, ...batch }) => ({
          ...batch,
          totalItems: _count.items,
          counts: counts.get(batch.id) ?? {
            PENDING: 0,
            APPROVED: 0,
            REJECTED: 0,
          },
        })),
      },
    };
  }

  async uploadCrawlerOutput(
    file:
      { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('فایل JSON کرالر را انتخاب کنید');
    if (!file.originalname.toLowerCase().endsWith('.json')) {
      throw new BadRequestException('فقط خروجی JSON کرالر قابل بارگذاری است');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(file.buffer.toString('utf8')) as unknown;
    } catch {
      throw new BadRequestException('ساختار فایل JSON معتبر نیست');
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new BadRequestException('خروجی کرالر باید یک فهرست غیرخالی باشد');
    }
    if (parsed.length > 2_000) {
      throw new BadRequestException(
        'هر فایل حداکثر می‌تواند ۲۰۰۰ ردیف داشته باشد',
      );
    }
    if (parsed.some((item) => !isCandidate(item))) {
      throw new BadRequestException('یکی از ردیف‌های خروجی کرالر معتبر نیست');
    }

    const contentHash = createHash('sha256').update(file.buffer).digest('hex');

    const candidates = parsed as Candidate[];
    const sourceFilename = basename(file.originalname).slice(0, 255);
    const fallbackUsername = sourceFilename.replace(/\.json$/i, '');
    const usernames = new Set(
      candidates
        .map((candidate) => stringValue(candidate.instagram_username))
        .filter(Boolean)
        .map(normalizeInstagramUsername),
    );

    const [destinations, hotels] = await this.prisma.$transaction([
      this.prisma.destination.findMany({ select: destinationSelect }),
      this.prisma.hotel.findMany({ select: hotelSelect }),
    ]);
    const destinationBySlug = new Map(
      destinations.map((destination) => [
        `${destination.type}:${destination.slug.toLowerCase()}`,
        destination,
      ]),
    );
    const hotelByName = new Map(
      hotels.map((hotel) => [normalizeText(hotel.name), hotel]),
    );
    const seenSourceUrls = new Set<string>();

    const items = candidates.map((candidate, index) => {
      const explicitUsername = stringValue(candidate.instagram_username);
      if (!explicitUsername && usernames.size > 1) {
        throw new BadRequestException(
          `آیدی اینستاگرام ردیف ${index + 1} مشخص نیست؛ در فایل چندحسابی صاحب هر ردیف باید مشخص باشد`,
        );
      }
      const instagramUsername = normalizeInstagramUsername(
        explicitUsername || [...usernames][0] || fallbackUsername,
      );
      const sourceUrl = normalizeSourceUrl(candidate.source_url);
      if (!sourceUrl) {
        throw new BadRequestException(`ردیف ${index + 1} لینک محتوا ندارد`);
      }
      const sourceKey = `${instagramUsername}:${sourceUrl}`;
      if (seenSourceUrls.has(sourceKey)) {
        throw new BadRequestException(
          `لینک محتوا در ردیف ${index + 1} تکراری است`,
        );
      }
      seenSourceUrls.add(sourceKey);

      const shortcode =
        stringValue(candidate.shortcode) || shortcodeFromUrl(sourceUrl);
      if (!shortcode) {
        throw new BadRequestException(`ردیف ${index + 1} Shortcode ندارد`);
      }

      const cityIds = destinationIdsFromCandidate(
        candidate.matched_city_slugs,
        DestinationType.CITY,
        destinationBySlug,
      );
      const provinceIds = destinationIdsFromCandidate(
        candidate.matched_province_slugs,
        DestinationType.PROVINCE,
        destinationBySlug,
      );
      for (const cityId of cityIds) {
        const city = destinations.find(
          (destination) => destination.id === cityId,
        );
        if (
          city?.parentProvinceId &&
          !provinceIds.includes(city.parentProvinceId)
        ) {
          provinceIds.push(city.parentProvinceId);
        }
      }

      const hotelName = guessHotelName(candidate);
      const knownHotel = hotelName
        ? hotelByName.get(normalizeText(hotelName))
        : undefined;
      const cityNames = namesForIds(cityIds, destinations);
      const provinceNames = namesForIds(provinceIds, destinations);
      const placeName = guessPlaceName(candidate, cityNames, provinceNames);

      return {
        displayOrder: index + 1,
        sourceUrl,
        shortcode,
        instagramUsername,
        hotelId: knownHotel?.id ?? null,
        hotelName: knownHotel?.name ?? (hotelName || null),
        cityIds,
        provinceIds,
        finalTitle: guessFinalTitle(candidate, placeName),
        placeName,
        placeType: guessPlaceType(candidate),
        contentType: guessContentType(candidate, sourceUrl),
        captionSummary: guessCaptionSummary(candidate),
        notes: stringValue(candidate.notes) || null,
        publishedAt: stringValue(candidate.published_at) || null,
        rawPayload: candidate as Prisma.InputJsonValue,
      };
    });

    const itemsByUsername = new Map<string, typeof items>();
    for (const item of items) {
      const group = itemsByUsername.get(item.instagramUsername) ?? [];
      group.push(item);
      itemsByUsername.set(item.instagramUsername, group);
    }

    const existingItems = await this.prisma.crawlReviewItem.findMany({
      where: {
        instagramUsername: { in: [...itemsByUsername.keys()] },
        shortcode: { in: items.map((item) => item.shortcode) },
      },
      select: { instagramUsername: true, shortcode: true },
    });
    const existingShortcodes = new Set(
      existingItems.map(
        (item) => `${item.instagramUsername}:${item.shortcode}`,
      ),
    );

    const batches = await this.prisma.$transaction(async (transaction) => {
      const results: UploadedReviewBatch[] = [];
      for (const [instagramUsername, accountItems] of itemsByUsername) {
        const freshItems = accountItems.filter(
          (item) =>
            !existingShortcodes.has(`${instagramUsername}:${item.shortcode}`),
        );
        if (freshItems.length === 0) {
          const previous = await transaction.crawlReviewBatch.findFirst({
            where: { instagramUsername },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, status: true },
          });
          if (!previous) {
            throw new ConflictException('محتوای تازه‌ای برای بررسی پیدا نشد');
          }
          results.push({
            ...previous,
            instagramUsername,
            totalItems: 0,
            skippedExisting: accountItems.length,
          });
          continue;
        }

        // Keep each downstream export/import scoped to its actual creator.
        const batchHash =
          itemsByUsername.size === 1
            ? contentHash
            : createHash('sha256')
                .update(`${contentHash}:${instagramUsername}`)
                .digest('hex');
        const created = await transaction.crawlReviewBatch.create({
          data: {
            instagramUsername,
            sourceFilename,
            contentHash: batchHash,
            createdById: userId,
          },
          select: { id: true },
        });
        await transaction.crawlReviewItem.createMany({
          data: freshItems.map((item, index) => ({
            ...item,
            displayOrder: index + 1,
            batchId: created.id,
          })),
        });
        results.push({
          id: created.id,
          status: CrawlReviewBatchStatus.REVIEWING,
          instagramUsername,
          totalItems: freshItems.length,
          skippedExisting: accountItems.length - freshItems.length,
        });
      }
      return results;
    });

    const selectedBatch =
      batches.find((batch) => batch.totalItems > 0) ?? batches[0];
    return {
      data: {
        ...selectedBatch,
        totalItems: batches.reduce(
          (count, batch) => count + batch.totalItems,
          0,
        ),
        skippedExisting: batches.reduce(
          (count, batch) => count + batch.skippedExisting,
          0,
        ),
        batches,
      },
    };
  }

  async getBatch(id: string, query: CrawlReviewQueryDto) {
    const batch = await this.prisma.crawlReviewBatch.findUnique({
      where: { id },
      select: {
        id: true,
        instagramUsername: true,
        sourceFilename: true,
        status: true,
        processingStatus: true,
        processingStartedAt: true,
        processingFinishedAt: true,
        processingLog: true,
        reviewedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!batch) throw new NotFoundException('فایل بررسی پیدا نشد');

    const skip = (query.page - 1) * query.pageSize;
    const [totalItems, items] = await this.prisma.$transaction([
      this.prisma.crawlReviewItem.count({ where: { batchId: id } }),
      this.prisma.crawlReviewItem.findMany({
        where: { batchId: id },
        orderBy: { displayOrder: 'asc' },
        skip,
        take: query.pageSize,
        select: {
          id: true,
          displayOrder: true,
          sourceUrl: true,
          shortcode: true,
          instagramUsername: true,
          reviewStatus: true,
          hotelId: true,
          hotelName: true,
          cityIds: true,
          provinceIds: true,
          finalTitle: true,
          rawPayload: true,
          updatedAt: true,
        },
      }),
    ]);
    const groupedCounts = await this.prisma.crawlReviewItem.groupBy({
      by: ['reviewStatus'],
      where: { batchId: id },
      orderBy: { reviewStatus: 'asc' },
      _count: { id: true },
    });

    return {
      data: {
        ...batch,
        items: items.map(({ rawPayload, ...item }) => ({
          ...item,
          preview: previewFromCandidate(rawPayload),
        })),
        counts: statusCounts(groupedCounts),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
        },
      },
    };
  }

  async updateItem(id: string, dto: UpdateCrawlReviewItemDto) {
    const item = await this.prisma.crawlReviewItem.findUnique({
      where: { id },
      select: { batchId: true, batch: { select: { status: true } } },
    });
    if (!item) throw new NotFoundException('ردیف بررسی پیدا نشد');
    if (item.batch.status === CrawlReviewBatchStatus.COMPLETED) {
      throw new BadRequestException('فایل پایان‌یافته قابل ویرایش نیست');
    }

    const cityIds = unique(dto.cityIds);
    const requestedProvinceIds = unique(dto.provinceIds);
    const destinations = await this.prisma.destination.findMany({
      where: { id: { in: [...cityIds, ...requestedProvinceIds] } },
      select: destinationSelect,
    });
    const foundIds = new Set(destinations.map((destination) => destination.id));
    const missingIds = [...cityIds, ...requestedProvinceIds].filter(
      (destinationId) => !foundIds.has(destinationId),
    );
    if (missingIds.length) {
      throw new BadRequestException('یک یا چند مقصد انتخاب‌شده معتبر نیستند');
    }
    if (
      cityIds.some(
        (cityId) =>
          destinations.find((destination) => destination.id === cityId)
            ?.type !== DestinationType.CITY,
      ) ||
      requestedProvinceIds.some(
        (provinceId) =>
          destinations.find((destination) => destination.id === provinceId)
            ?.type !== DestinationType.PROVINCE,
      )
    ) {
      throw new BadRequestException('نوع شهر یا استان انتخاب‌شده معتبر نیست');
    }

    const provinceIds = [...requestedProvinceIds];
    for (const cityId of cityIds) {
      const city = destinations.find(
        (destination) => destination.id === cityId,
      );
      if (
        city?.parentProvinceId &&
        !provinceIds.includes(city.parentProvinceId)
      ) {
        provinceIds.push(city.parentProvinceId);
      }
    }

    let hotelName = cleanOptional(dto.hotelName);
    const hotelId = dto.hotelId || null;
    if (hotelId) {
      const hotel = await this.prisma.hotel.findUnique({
        where: { id: hotelId },
        select: { name: true },
      });
      if (!hotel) throw new BadRequestException('هتل انتخاب‌شده معتبر نیست');
      hotelName = hotel.name;
    }

    const finalTitle = cleanOptional(dto.finalTitle);
    if (dto.reviewStatus === CrawlReviewItemStatus.APPROVED) {
      if (!finalTitle) {
        throw new BadRequestException('برای تأیید، عنوان نهایی را وارد کنید');
      }
      if (provinceIds.length === 0) {
        throw new BadRequestException('برای تأیید، حداقل یک استان انتخاب کنید');
      }
    }

    const placeName =
      namesForIds(cityIds, destinations)[0] ??
      namesForIds(provinceIds, destinations)[0] ??
      null;

    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.crawlReviewItem.update({
        where: { id },
        data: {
          reviewStatus: dto.reviewStatus,
          hotelId,
          hotelName,
          cityIds,
          provinceIds,
          finalTitle,
          placeName,
        },
        select: { id: true, reviewStatus: true, updatedAt: true },
      });
      const pending = await transaction.crawlReviewItem.count({
        where: {
          batchId: item.batchId,
          reviewStatus: CrawlReviewItemStatus.PENDING,
        },
      });
      await transaction.crawlReviewBatch.update({
        where: { id: item.batchId },
        data:
          pending === 0 && item.batch.status === CrawlReviewBatchStatus.READY
            ? { status: CrawlReviewBatchStatus.READY }
            : { status: CrawlReviewBatchStatus.REVIEWING, reviewedAt: null },
      });
      return result;
    });

    return { data: updated };
  }

  async finishReview(id: string) {
    const batch = await this.requireBatch(id);
    if (batch.status === CrawlReviewBatchStatus.COMPLETED) {
      throw new BadRequestException('این فایل قبلاً پایان یافته است');
    }
    const pending = await this.prisma.crawlReviewItem.count({
      where: { batchId: id, reviewStatus: CrawlReviewItemStatus.PENDING },
    });
    if (pending > 0) {
      throw new BadRequestException(
        `${pending.toLocaleString('fa-IR')} ردیف هنوز بررسی نشده است`,
      );
    }
    const updated = await this.prisma.crawlReviewBatch.update({
      where: { id },
      data: { status: CrawlReviewBatchStatus.READY, reviewedAt: new Date() },
      select: { id: true, status: true, reviewedAt: true },
    });
    return { data: updated };
  }

  async complete(id: string) {
    const batch = await this.requireBatch(id);
    if (batch.status !== CrawlReviewBatchStatus.READY) {
      throw new BadRequestException(
        'فقط فایل بررسی‌شده را می‌توانید پایان‌یافته اعلام کنید',
      );
    }
    const updated = await this.prisma.crawlReviewBatch.update({
      where: { id },
      data: {
        status: CrawlReviewBatchStatus.COMPLETED,
        completedAt: new Date(),
      },
      select: { id: true, status: true, completedAt: true },
    });
    return { data: updated };
  }

  async startProcessing(
    id: string,
    actorId: string,
    actorRole: UserRole,
    sessionToken: string,
  ) {
    if (actorRole !== UserRole.MODERATOR) {
      throw new ForbiddenException(
        'اجرای مستقیم دانلود و ورود داده فقط برای ناظر محتوا مجاز است',
      );
    }
    if (!this.config.get('CRAWL_PROCESSING_ENABLED', { infer: true })) {
      throw new ServiceUnavailableException(
        'پردازش مستقیم روی این سرور هنوز فعال نشده است',
      );
    }

    const batch = await this.requireBatch(id);
    if (batch.status !== CrawlReviewBatchStatus.READY) {
      throw new BadRequestException(
        'فقط فایل بررسی‌شده را می‌توانید مستقیماً وارد سایت کنید',
      );
    }
    if (batch.processingStatus === CrawlReviewProcessingStatus.RUNNING) {
      throw new ConflictException('پردازش این فایل هم‌اکنون در حال اجرا است');
    }

    const running = await this.prisma.crawlReviewBatch.count({
      where: { processingStatus: CrawlReviewProcessingStatus.RUNNING },
    });
    if (running > 0) {
      throw new ConflictException(
        'یک فایل دیگر در حال پردازش است؛ پس از پایان آن دوباره تلاش کنید',
      );
    }

    const claimed = await this.prisma.crawlReviewBatch.updateMany({
      where: {
        id,
        status: CrawlReviewBatchStatus.READY,
        processingStatus: { not: CrawlReviewProcessingStatus.RUNNING },
      },
      data: {
        processingStatus: CrawlReviewProcessingStatus.RUNNING,
        processingStartedAt: new Date(),
        processingFinishedAt: null,
        processingLog: 'پردازش در صف اجرا قرار گرفت.',
        processedById: actorId,
      },
    });
    if (claimed.count !== 1) {
      throw new ConflictException('پردازش این فایل قبلاً شروع شده است');
    }

    void this.runProcessingJob(id, sessionToken).catch((error: unknown) => {
      this.logger.error(
        `Unhandled crawl processing error for ${id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    });

    return {
      data: {
        id,
        processingStatus: CrawlReviewProcessingStatus.RUNNING,
      },
    };
  }

  async createLocalProcessingTicket(
    id: string,
    actorId: string,
    actorRole: UserRole,
  ) {
    if (actorRole !== UserRole.MODERATOR) {
      throw new ForbiddenException(
        'دانلود و ورود مستقیم فقط برای ناظر محتوا مجاز است',
      );
    }
    const batch = await this.requireBatch(id);
    if (batch.status !== CrawlReviewBatchStatus.READY) {
      throw new BadRequestException('ابتدا بررسی همه ردیف‌ها را کامل کنید');
    }
    if (batch.processingStatus === CrawlReviewProcessingStatus.RUNNING) {
      throw new ConflictException('پردازش این فایل هم‌اکنون در حال اجرا است');
    }

    const startedAt = new Date();
    const issuedAt = startedAt.getTime();
    const expiresAt = issuedAt + 3 * 60 * 60 * 1_000;
    const token = this.signLocalTicket({
      batchId: id,
      actorId,
      issuedAt,
      expiresAt,
      nonce: randomBytes(12).toString('base64url'),
    });
    const claimed = await this.prisma.crawlReviewBatch.updateMany({
      where: {
        id,
        status: CrawlReviewBatchStatus.READY,
        processingStatus: { not: CrawlReviewProcessingStatus.RUNNING },
      },
      data: {
        processingStatus: CrawlReviewProcessingStatus.RUNNING,
        processingStartedAt: startedAt,
        processingFinishedAt: null,
        processingLog:
          'پردازش روی لپ‌تاپ ناظر شروع شد؛ نشست اینستاگرام از دستگاه خارج نمی‌شود.',
        processedById: actorId,
      },
    });
    if (claimed.count !== 1) {
      throw new ConflictException('پردازش این فایل هم‌اکنون در حال اجرا است');
    }
    return {
      data: {
        batchId: id,
        token,
        expiresAt: new Date(expiresAt).toISOString(),
      },
    };
  }

  async assertLocalProcessingTicket(
    id: string,
    authorization: string | undefined,
  ) {
    const payload = this.verifyLocalTicketSignature(id, authorization);
    const batch = await this.prisma.crawlReviewBatch.findUnique({
      where: { id },
      select: {
        processingStatus: true,
        processingStartedAt: true,
        processedById: true,
      },
    });
    if (
      !batch ||
      batch.processingStatus !== CrawlReviewProcessingStatus.RUNNING ||
      batch.processedById !== payload.actorId ||
      batch.processingStartedAt?.getTime() !== payload.issuedAt
    ) {
      throw new ForbiddenException('مجوز پردازش محلی دیگر معتبر نیست');
    }
    return payload;
  }

  async uploadLocalWorkerMedia(
    id: string,
    mediaPath: string | undefined,
    request: Readable & {
      headers: Record<string, string | string[] | undefined>;
    },
  ) {
    const normalizedPath = decodeURIComponent(mediaPath ?? '').trim();
    if (
      !/^\/(?:travel-videos|hotel-videos)\/[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*\.(?:mp4|webp)$/i.test(
        normalizedPath,
      )
    ) {
      throw new BadRequestException('مسیر رسانه معتبر نیست');
    }
    const declaredLength = Number(request.headers['content-length'] ?? 0);
    const maxBytes = 300 * 1_024 * 1_024;
    const maxChunkBytes = 10 * 1_024 * 1_024;
    if (
      !Number.isSafeInteger(declaredLength) ||
      declaredLength <= 0 ||
      declaredLength > maxChunkBytes
    ) {
      throw new BadRequestException(
        'حجم بخش رسانه معتبر نیست یا بیش از حد مجاز است',
      );
    }

    const uploadId = String(request.headers['x-upload-id'] ?? '');
    const chunkIndex = Number(request.headers['x-chunk-index'] ?? 0);
    const chunkCount = Number(request.headers['x-chunk-count'] ?? 1);
    const chunkOffset = Number(request.headers['x-chunk-offset'] ?? 0);
    const totalSize = Number(request.headers['x-total-size'] ?? declaredLength);
    if (
      !/^[a-f0-9]{32}$/i.test(uploadId) ||
      !Number.isSafeInteger(chunkIndex) ||
      !Number.isSafeInteger(chunkCount) ||
      !Number.isSafeInteger(chunkOffset) ||
      !Number.isSafeInteger(totalSize) ||
      chunkIndex < 0 ||
      chunkCount < 1 ||
      chunkCount > 1_024 ||
      chunkIndex >= chunkCount ||
      chunkOffset < 0 ||
      totalSize <= 0 ||
      totalSize > maxBytes ||
      chunkOffset + declaredLength > totalSize
    ) {
      throw new BadRequestException('اطلاعات انتقال بخش‌بندی‌شده معتبر نیست');
    }

    const publicDirectory = await this.resolveWebPublicDirectory();
    const target = resolve(publicDirectory, normalizedPath.slice(1));
    if (!target.startsWith(`${publicDirectory}${sep}`)) {
      throw new BadRequestException('مسیر رسانه خارج از پوشه مجاز است');
    }
    await mkdir(dirname(target), { recursive: true });
    const temporary = `${target}.upload-${id}-${uploadId}`;
    if (chunkIndex === 0) {
      await unlink(temporary).catch(() => undefined);
    } else {
      const currentSize = await stat(temporary)
        .then((value) => value.size)
        .catch(() => -1);
      if (currentSize !== chunkOffset) {
        throw new BadRequestException(
          'ترتیب بخش‌های رسانه معتبر نیست؛ انتقال را دوباره شروع کنید',
        );
      }
    }
    let received = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        received += chunk.length;
        callback(
          received > maxBytes
            ? new Error('حجم رسانه بیش از حد مجاز است')
            : null,
          chunk,
        );
      },
    });
    try {
      await pipeline(
        request,
        limiter,
        createWriteStream(temporary, { flags: chunkIndex === 0 ? 'wx' : 'a' }),
      );
      if (received !== declaredLength) {
        throw new Error('رسانه به‌صورت ناقص دریافت شد');
      }
      const uploadedSize = chunkOffset + received;
      const isLastChunk = chunkIndex === chunkCount - 1;
      if (isLastChunk && uploadedSize !== totalSize) {
        throw new Error('اندازه نهایی رسانه با مقدار اعلام‌شده یکسان نیست');
      }
      if (isLastChunk) await rename(temporary, target);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'ذخیره رسانه انجام نشد',
      );
    }
    return {
      data: {
        path: normalizedPath,
        bytes: chunkOffset + received,
        complete: chunkIndex === chunkCount - 1,
      },
    };
  }

  async completeLocalProcessing(id: string) {
    const updated = await this.prisma.crawlReviewBatch.update({
      where: { id },
      data: {
        status: CrawlReviewBatchStatus.COMPLETED,
        completedAt: new Date(),
        processingStatus: CrawlReviewProcessingStatus.SUCCEEDED,
        processingFinishedAt: new Date(),
        processingLog:
          'دانلود، انتقال رسانه و ورود اطلاعات با موفقیت انجام شد.',
      },
      select: { id: true, status: true, processingStatus: true },
    });
    return { data: updated };
  }

  async assertLocalWorkerVideo(id: string, sourceUrl: string) {
    const normalizedSourceUrl = normalizeSourceUrl(sourceUrl);
    const shortcode = shortcodeFromUrl(normalizedSourceUrl);
    if (!shortcode) {
      throw new ForbiddenException('محتوا متعلق به این فایل بررسی نیست');
    }
    const item = await this.prisma.crawlReviewItem.findFirst({
      where: {
        batchId: id,
        shortcode,
        reviewStatus: CrawlReviewItemStatus.APPROVED,
      },
      select: { id: true },
    });
    if (!item) {
      throw new ForbiddenException('محتوا متعلق به این فایل بررسی نیست');
    }
  }

  async failLocalProcessing(id: string, message: string | undefined) {
    const detail =
      cleanOptional(message)?.slice(0, 20_000) ?? 'پردازش محلی ناموفق بود.';
    const updated = await this.prisma.crawlReviewBatch.update({
      where: { id },
      data: {
        processingStatus: CrawlReviewProcessingStatus.FAILED,
        processingFinishedAt: new Date(),
        processingLog: detail,
      },
      select: { id: true, processingStatus: true },
    });
    return { data: updated };
  }

  async resetLocalProcessing(id: string, actorId: string, actorRole: UserRole) {
    if (actorRole !== UserRole.MODERATOR) {
      throw new ForbiddenException(
        'فقط ناظر اجراکننده می‌تواند پردازش را متوقف کند',
      );
    }
    const changed = await this.prisma.crawlReviewBatch.updateMany({
      where: {
        id,
        status: CrawlReviewBatchStatus.READY,
        processingStatus: CrawlReviewProcessingStatus.RUNNING,
        processedById: actorId,
      },
      data: {
        processingStatus: CrawlReviewProcessingStatus.FAILED,
        processingFinishedAt: new Date(),
        processingLog:
          'اتصال برنامه محلی پیش از شروع پردازش قطع شد؛ دوباره تلاش کنید.',
      },
    });
    if (changed.count !== 1) {
      throw new ForbiddenException('این پردازش به حساب شما تعلق ندارد');
    }
    return {
      data: { id, processingStatus: CrawlReviewProcessingStatus.FAILED },
    };
  }

  async exportBatch(id: string) {
    const batch = await this.requireBatch(id);
    if (batch.status === CrawlReviewBatchStatus.REVIEWING) {
      throw new BadRequestException('ابتدا بررسی تمام ردیف‌ها را کامل کنید');
    }
    const [items, destinations, hotels] = await this.prisma.$transaction([
      this.prisma.crawlReviewItem.findMany({
        where: { batchId: id },
        orderBy: { displayOrder: 'asc' },
      }),
      this.prisma.destination.findMany({ select: destinationSelect }),
      this.prisma.hotel.findMany({ select: hotelSelect }),
    ]);
    const destinationById = new Map(
      destinations.map((destination) => [destination.id, destination]),
    );
    const hotelById = new Map(hotels.map((hotel) => [hotel.id, hotel]));

    return {
      version: 1,
      kind: 'hotel-yab-crawl-review',
      exportedAt: new Date().toISOString(),
      batch: {
        id: batch.id,
        instagramUsername: batch.instagramUsername,
        sourceFilename: batch.sourceFilename,
      },
      rows: items.map((item) => ({
        اینستاگرام: item.instagramUsername,
        'لینک پست': item.sourceUrl,
        'تاریخ انتشار': item.publishedAt ?? '',
        'وضعیت بررسی': item.reviewStatus.toLowerCase(),
        هتل:
          (item.hotelId ? hotelById.get(item.hotelId)?.name : undefined) ??
          item.hotelName ??
          '',
        'شهر نهایی': item.cityIds
          .map((destinationId) => destinationById.get(destinationId)?.name)
          .filter(Boolean)
          .join(' | '),
        'استان نهایی': item.provinceIds
          .map((destinationId) => destinationById.get(destinationId)?.name)
          .filter(Boolean)
          .join(' | '),
        'نام مکان نهایی': item.placeName ?? '',
        'عنوان نهایی': item.finalTitle ?? '',
        'نوع مکان': item.placeType ?? 'OTHER',
        'نوع محتوا': item.contentType ?? 'REEL',
        'خلاصه کپشن': item.captionSummary ?? 'محتوای سفر',
        یادداشت: item.notes ?? '',
        Shortcode: item.shortcode,
        _row_number: item.displayOrder + 1,
      })),
      candidates: items.map((item) => item.rawPayload),
    };
  }

  async deleteBatch(id: string) {
    await this.requireBatch(id);
    await this.prisma.crawlReviewBatch.delete({ where: { id } });
    return { data: { success: true } };
  }

  private async requireBatch(id: string) {
    const batch = await this.prisma.crawlReviewBatch.findUnique({
      where: { id },
      select: {
        id: true,
        instagramUsername: true,
        sourceFilename: true,
        status: true,
        processingStatus: true,
      },
    });
    if (!batch) throw new NotFoundException('فایل بررسی پیدا نشد');
    return batch;
  }

  private async runProcessingJob(id: string, sessionToken: string) {
    const logs: string[] = [];
    try {
      const repoRootConfig = this.config.get('CRAWL_PROCESSING_REPO_ROOT', {
        infer: true,
      });
      const python = this.config.get('CRAWL_PROCESSING_PYTHON', {
        infer: true,
      });
      const instagramLogin = this.config.get(
        'CRAWL_PROCESSING_INSTAGRAM_LOGIN',
        { infer: true },
      );
      if (!repoRootConfig || !instagramLogin) {
        throw new Error('تنظیمات پردازش مستقیم روی سرور کامل نیست');
      }
      const repoRoot = resolve(repoRootConfig);
      const apiBase = this.config.get('CRAWL_PROCESSING_API_BASE', {
        infer: true,
      });
      const batch = await this.requireBatch(id);
      const payload = await this.exportBatch(id);
      const jobDirectory = join(
        repoRoot,
        'tools',
        'instagram-travel-finder',
        'output',
        'admin-jobs',
        id,
      );
      await mkdir(jobDirectory, { recursive: true });
      const reviewedFile = join(
        jobDirectory,
        `${batch.instagramUsername}.reviewed.json`,
      );
      await writeFile(reviewedFile, JSON.stringify(payload, null, 2), 'utf8');

      const commonEnvironment = {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        HOTELYAB_ADMIN_COOKIE: `hotel_yab_session=${sessionToken}`,
        HOTELYAB_API_BASE: apiBase,
      };
      const toolRoot = join(repoRoot, 'tools', 'instagram-travel-finder');
      const commands: Array<{ label: string; script: string; args: string[] }> =
        [
          {
            label: 'دانلود و آماده‌سازی رسانه‌ها',
            script: 'download_approved.py',
            args: [
              reviewedFile,
              '--download',
              '--prepare-media',
              '--login',
              instagramLogin,
            ],
          },
          {
            label: 'بررسی آزمایشی ورود داده',
            script: 'import_approved.py',
            args: [reviewedFile, '--dry-run'],
          },
          {
            label: 'ورود نهایی داده به سایت',
            script: 'import_approved.py',
            args: [reviewedFile, '--apply'],
          },
        ];

      for (const command of commands) {
        logs.push(`\n=== ${command.label} ===\n`);
        await runCommand(
          python,
          [join(toolRoot, command.script), ...command.args],
          repoRoot,
          commonEnvironment,
          (chunk) => logs.push(chunk),
        );
        await this.saveProcessingLog(id, logs);
      }

      await this.prisma.crawlReviewBatch.update({
        where: { id },
        data: {
          status: CrawlReviewBatchStatus.COMPLETED,
          completedAt: new Date(),
          processingStatus: CrawlReviewProcessingStatus.SUCCEEDED,
          processingFinishedAt: new Date(),
          processingLog: trimProcessingLog(logs.join('')),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'خطای ناشناخته در پردازش';
      logs.push(`\nخطا: ${message}\n`);
      await this.prisma.crawlReviewBatch.update({
        where: { id },
        data: {
          processingStatus: CrawlReviewProcessingStatus.FAILED,
          processingFinishedAt: new Date(),
          processingLog: trimProcessingLog(logs.join('')),
        },
      });
      this.logger.error(`Crawl processing failed for ${id}: ${message}`);
    }
  }

  private async saveProcessingLog(id: string, logs: string[]) {
    await this.prisma.crawlReviewBatch.update({
      where: { id },
      data: { processingLog: trimProcessingLog(logs.join('')) },
    });
  }

  private signLocalTicket(payload: LocalTicketPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac(
      'sha256',
      this.config.get('AUTH_OTP_SECRET', { infer: true }),
    )
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verifyLocalTicketSignature(
    id: string,
    authorization: string | undefined,
  ): LocalTicketPayload {
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
    const [encoded, signature, extra] = token.split('.');
    if (!encoded || !signature || extra) {
      throw new ForbiddenException('مجوز پردازش محلی معتبر نیست');
    }
    const expected = createHmac(
      'sha256',
      this.config.get('AUTH_OTP_SECRET', { infer: true }),
    )
      .update(encoded)
      .digest();
    let provided: Buffer;
    try {
      provided = Buffer.from(signature, 'base64url');
    } catch {
      throw new ForbiddenException('مجوز پردازش محلی معتبر نیست');
    }
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      throw new ForbiddenException('مجوز پردازش محلی معتبر نیست');
    }
    let payload: LocalTicketPayload;
    try {
      payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as LocalTicketPayload;
    } catch {
      throw new ForbiddenException('مجوز پردازش محلی معتبر نیست');
    }
    if (
      payload.batchId !== id ||
      typeof payload.actorId !== 'string' ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt <= Date.now()
    ) {
      throw new ForbiddenException('مجوز پردازش محلی منقضی یا نامعتبر است');
    }
    return payload;
  }

  private async resolveWebPublicDirectory(): Promise<string> {
    const configured = this.config.get('CRAWL_PROCESSING_REPO_ROOT', {
      infer: true,
    });
    const candidates = [
      configured ? resolve(configured, 'apps/web/public') : '',
      resolve(process.cwd(), '../web/public'),
      resolve(process.cwd(), 'apps/web/public'),
      resolve(process.cwd(), '../../apps/web/public'),
    ].filter(Boolean);
    for (const candidate of candidates) {
      try {
        await access(candidate);
        return candidate;
      } catch {
        // Continue to the next known repository layout.
      }
    }
    throw new ServiceUnavailableException('پوشه رسانه‌های سایت پیدا نشد');
  }
}

type LocalTicketPayload = {
  batchId: string;
  actorId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

function runCommand(
  executable: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  onOutput: (chunk: string) => void,
): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, args, {
      cwd,
      env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk: Buffer) => onOutput(chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => onOutput(chunk.toString()));
    child.once('error', rejectPromise);
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(
          `فرمان با کد ${code ?? 'نامشخص'}${signal ? ` و سیگنال ${signal}` : ''} متوقف شد`,
        ),
      );
    });
  });
}

function trimProcessingLog(value: string): string {
  const maxLength = 120_000;
  return value.length <= maxLength ? value : value.slice(-maxLength);
}

function isCandidate(value: unknown): value is Candidate {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function previewFromCandidate(rawPayload: unknown) {
  if (!isCandidate(rawPayload)) return null;
  const mediaItems = Array.isArray(rawPayload.media_items)
    ? rawPayload.media_items.filter(isCandidate)
    : [];
  const first = mediaItems[0];
  const firstMediaType = stringValue(
    first?.media_type ?? first?.mediaType,
  ).toUpperCase();
  const firstDownloadUrl = stringValue(
    first?.download_url ?? first?.downloadUrl,
  );
  const videoUrl =
    stringValue(rawPayload.video_download_url) ||
    mediaItems
      .filter(
        (item) =>
          stringValue(item.media_type ?? item.mediaType).toUpperCase() ===
          'VIDEO',
      )
      .map((item) => stringValue(item.download_url ?? item.downloadUrl))
      .find(Boolean) ||
    '';
  const thumbnailUrl =
    stringValue(rawPayload.thumbnail_source_url) ||
    stringValue(first?.thumbnail_source_url ?? first?.thumbnailUrl) ||
    (firstMediaType === 'IMAGE' ? firstDownloadUrl : '');
  const mediaType = videoUrl
    ? 'VIDEO'
    : firstMediaType === 'VIDEO'
      ? 'VIDEO'
      : 'IMAGE';
  const mediaUrl = videoUrl || firstDownloadUrl || thumbnailUrl;
  if (!mediaUrl && !thumbnailUrl) return null;
  return {
    mediaType,
    mediaUrl: mediaUrl || null,
    thumbnailUrl: thumbnailUrl || null,
    itemCount: Math.max(1, mediaItems.length),
  };
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanOptional(value: string | null | undefined): string | null {
  const cleaned = value?.trim() ?? '';
  return cleaned || null;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeInstagramUsername(value: string): string {
  const normalized = value.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(normalized)) {
    throw new BadRequestException('نام فایل یا آیدی اینستاگرام معتبر نیست');
  }
  return normalized;
}

function normalizeSourceUrl(value: unknown): string {
  const normalized = stringValue(value).replace(/\/$/, '');
  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? normalized
      : '';
  } catch {
    return '';
  }
}

function shortcodeFromUrl(sourceUrl: string): string {
  const match = sourceUrl.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? '';
}

function splitValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitValues(item));
  }
  return stringValue(value)
    .split('|')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function destinationIdsFromCandidate(
  value: unknown,
  type: (typeof DestinationType)[keyof typeof DestinationType],
  destinations: Map<
    string,
    {
      id: string;
      type: string;
      slug: string;
      name: string;
      parentProvinceId: string | null;
    }
  >,
): string[] {
  return unique(
    splitValues(value)
      .map((slug) => destinations.get(`${type}:${slug}`)?.id)
      .filter((id): id is string => Boolean(id)),
  );
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('fa-IR')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ');
}

function guessHotelName(candidate: Candidate): string {
  const existing = stringValue(candidate.hotel);
  if (existing) return existing;
  const location = stringValue(candidate.instagram_location);
  if (/هتل|hotel/i.test(location)) return location;
  const words = stringValue(candidate.caption)
    .replace(/\u200c/g, ' ')
    .split(/\s+/);
  const hotelIndex = words.findIndex((word) => /هتل|^hotel$/i.test(word));
  return hotelIndex >= 0
    ? words.slice(hotelIndex, hotelIndex + 4).join(' ')
    : '';
}

function namesForIds(
  ids: string[],
  destinations: Array<{ id: string; name: string }>,
): string[] {
  const byId = new Map(
    destinations.map((destination) => [destination.id, destination.name]),
  );
  return ids
    .map((id) => byId.get(id))
    .filter((name): name is string => Boolean(name));
}

function hasPersian(value: string): boolean {
  return /[\u0600-\u06ff]/.test(value);
}

function guessPlaceName(
  candidate: Candidate,
  cityNames: string[],
  provinceNames: string[],
): string {
  if (cityNames[0]) return cityNames[0];
  if (provinceNames[0]) return provinceNames[0];
  const existing = stringValue(candidate.place_name);
  if (hasPersian(existing)) return existing;
  const location = stringValue(candidate.instagram_location);
  return hasPersian(location) ? location : 'نیاز به بررسی';
}

function guessFinalTitle(candidate: Candidate, placeName: string): string {
  const existing = stringValue(candidate.final_title);
  if (hasPersian(existing)) return existing.slice(0, 240);
  if (placeName !== 'نیاز به بررسی') return `سفر به ${placeName}`;
  const captionLine = stringValue(candidate.caption)
    .split('\n')
    .map((line) => line.trim())
    .find(hasPersian);
  return (captionLine?.slice(0, 80) || 'ویدیوی سفر').slice(0, 240);
}

function guessPlaceType(candidate: Candidate): string {
  const existing = stringValue(candidate.place_type).toUpperCase();
  if (existing) return existing.slice(0, 40);
  if (candidate.is_hotel_priority === true) return 'HOTEL';
  const text =
    `${stringValue(candidate.caption)} ${stringValue(candidate.instagram_location)}`.toLowerCase();
  if (/کوه|mountain/.test(text)) return 'MOUNTAIN';
  if (/ساحل|دریا|beach/.test(text)) return 'BEACH';
  if (/کویر|desert/.test(text)) return 'DESERT';
  if (/رستوران|کافه|غذا|restaurant|cafe/.test(text)) return 'FOOD';
  if (/مسجد|حرم|امامزاده/.test(text)) return 'RELIGIOUS';
  if (/موزه|کاخ|قلعه|تاریخی/.test(text)) return 'HISTORICAL';
  return 'OTHER';
}

function guessContentType(candidate: Candidate, sourceUrl: string): string {
  const existing = stringValue(candidate.content_type).toUpperCase();
  if (existing) return existing.slice(0, 40);
  const productType = stringValue(candidate.product_type).toLowerCase();
  if (productType === 'clips' || sourceUrl.includes('/reel/')) return 'REEL';
  if (productType === 'carousel_container') return 'CAROUSEL';
  return 'POST';
}

function guessCaptionSummary(candidate: Candidate): string {
  const existing = stringValue(candidate.caption_summary);
  if (existing) return existing;
  const caption = stringValue(candidate.caption).replace(/\s+/g, ' ');
  return caption.slice(0, 180) || 'محتوای سفر';
}

function statusCounts(
  rows: Array<{
    reviewStatus: (typeof CrawlReviewItemStatus)[keyof typeof CrawlReviewItemStatus];
    _count?: true | { id?: number };
  }>,
) {
  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const row of rows) counts[row.reviewStatus] = aggregateCount(row._count);
  return counts;
}

function aggregateCount(value: true | { id?: number } | undefined): number {
  return typeof value === 'object' ? (value.id ?? 0) : 0;
}
