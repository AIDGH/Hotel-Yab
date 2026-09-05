import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const nodeEnvironment = process.env.NODE_ENV ?? 'development';

loadEnvironment({
  path: [`.env.${nodeEnvironment}`, '.env'],
  quiet: true,
});

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error('DATABASE_URL is required to export data');

  const outputPath = resolve(
    process.cwd(),
    process.argv[2] ?? 'prisma/data/import.json',
  );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const [hotels, notablePeople, sources, associations, destinations, videos] =
      await prisma.$transaction([
        prisma.hotel.findMany({ orderBy: { slug: 'asc' } }),
        prisma.notablePerson.findMany({ orderBy: { slug: 'asc' } }),
        prisma.source.findMany({ orderBy: { url: 'asc' } }),
        prisma.hotelAssociation.findMany({
          orderBy: { referenceKey: 'asc' },
          include: {
            hotel: { select: { slug: true } },
            notablePerson: { select: { slug: true } },
            evidence: { include: { source: { select: { url: true } } } },
          },
        }),
        prisma.destination.findMany({
          orderBy: [{ type: 'desc' }, { displayOrder: 'asc' }, { slug: 'asc' }],
          include: { parentProvince: { select: { slug: true } } },
        }),
        prisma.video.findMany({
          orderBy: { id: 'asc' },
          include: {
            mediaItems: { orderBy: { displayOrder: 'asc' } },
            destinations: { include: { destination: true } },
            hotels: { include: { hotel: { select: { slug: true } } } },
          },
        }),
      ]);

    const dataset = {
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

    await writeFile(
      outputPath,
      `${JSON.stringify(dataset, null, 2)}\n`,
      'utf8',
    );
    console.log('Hotel-Yab data export completed:', {
      outputPath,
      hotels: dataset.hotels.length,
      notablePeople: dataset.notablePeople.length,
      sources: dataset.sources.length,
      associations: dataset.associations.length,
      destinations: dataset.destinations.length,
      videos: dataset.videos.length,
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
