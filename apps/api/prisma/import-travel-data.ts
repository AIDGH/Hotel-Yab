import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  DestinationType,
  PublicationStatus,
  VerificationStatus,
} from '../src/generated/prisma/enums';

type DestinationInput = {
  name: string;
  slug: string;
  parentProvinceSlug?: string;
  imageUrl?: string | null;
  description?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
  primarySourceUrl?: string | null;
  sourceType?: string | null;
  notes?: string | null;
};

type TravelVideoInput = {
  videoId: string;
  instagramUsername: string;
  platform: string;
  personCategory: string;
  contentType: string;
  sourceUrl: string;
  title: string;
  placeName: string;
  placeType: string;
  publishedDate: string;
  captionSummary: string;
  evidenceType: string;
  verificationStatus: VerificationStatus;
  notes?: string | null;
  mediaUrl: string;
  thumbnailUrl: string;
};

type TravelDataset = {
  destinations: {
    provinces: DestinationInput[];
    cities: DestinationInput[];
  };
  videos: {
    videos: TravelVideoInput[];
    videoDestinations: Array<{
      videoId: string;
      destinationType: DestinationType;
      destinationSlug: string;
    }>;
  };
};

const nodeEnvironment = process.env.NODE_ENV ?? 'development';
loadEnvironment({
  path: [`.env.${nodeEnvironment}`, '.env'],
  quiet: true,
});

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const webDataDirectory = resolve(process.cwd(), '../web/src/data');
  const [destinations, videos] = await Promise.all([
    readJson<TravelDataset['destinations']>(
      resolve(webDataDirectory, 'destinations.json'),
    ),
    readJson<TravelDataset['videos']>(
      resolve(webDataDirectory, 'travel-videos.json'),
    ),
  ]);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    await prisma.$transaction(async (transaction) => {
      for (const province of destinations.provinces) {
        await transaction.destination.upsert({
          where: {
            type_slug: { type: DestinationType.PROVINCE, slug: province.slug },
          },
          create: destinationData(province, DestinationType.PROVINCE),
          update: destinationData(province, DestinationType.PROVINCE),
        });
      }

      for (const city of destinations.cities) {
        const parentProvince = city.parentProvinceSlug
          ? await transaction.destination.findUnique({
              where: {
                type_slug: {
                  type: DestinationType.PROVINCE,
                  slug: city.parentProvinceSlug,
                },
              },
              select: { id: true },
            })
          : null;
        const data = {
          ...destinationData(city, DestinationType.CITY),
          parentProvinceId: parentProvince?.id ?? null,
        };
        await transaction.destination.upsert({
          where: {
            type_slug: { type: DestinationType.CITY, slug: city.slug },
          },
          create: data,
          update: data,
        });
      }

      for (const video of videos.videos) {
        await transaction.video.upsert({
          where: { id: video.videoId },
          create: videoData(video),
          update: videoData(video),
        });
      }

      for (const link of videos.videoDestinations) {
        const destination = await transaction.destination.findUniqueOrThrow({
          where: {
            type_slug: {
              type: link.destinationType,
              slug: link.destinationSlug,
            },
          },
          select: { id: true },
        });
        await transaction.videoDestination.upsert({
          where: {
            videoId_destinationId: {
              videoId: link.videoId,
              destinationId: destination.id,
            },
          },
          create: { videoId: link.videoId, destinationId: destination.id },
          update: {},
        });
      }
    });

    console.log('Travel data import completed:', {
      provinces: destinations.provinces.length,
      cities: destinations.cities.length,
      videos: videos.videos.length,
      videoDestinations: videos.videoDestinations.length,
    });
  } finally {
    await prisma.$disconnect();
  }
}

function destinationData(input: DestinationInput, type: DestinationType) {
  return {
    type,
    slug: input.slug,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    isFeatured: input.isFeatured ?? false,
    displayOrder: input.displayOrder ?? null,
    primarySourceUrl: input.primarySourceUrl?.trim() || null,
    sourceType: input.sourceType?.trim() || null,
    notes: input.notes?.trim() || null,
    publicationStatus: PublicationStatus.PUBLISHED,
  };
}

function videoData(input: TravelVideoInput) {
  return {
    id: input.videoId,
    instagramUsername: input.instagramUsername.replace(/^@/, '').toLowerCase(),
    platform: input.platform,
    personCategory: input.personCategory,
    contentType: input.contentType,
    sourceUrl: input.sourceUrl,
    title: input.title,
    placeName: input.placeName,
    placeType: input.placeType,
    publishedDate: input.publishedDate,
    captionSummary: input.captionSummary,
    evidenceType: input.evidenceType,
    verificationStatus: input.verificationStatus,
    notes: input.notes?.trim() || null,
    mediaUrl: input.mediaUrl,
    thumbnailUrl: input.thumbnailUrl,
    publicationStatus: PublicationStatus.PUBLISHED,
  };
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
