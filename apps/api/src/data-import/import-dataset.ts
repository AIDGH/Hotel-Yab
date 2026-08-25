import { PrismaClient } from '../generated/prisma/client';
import {
  DestinationType,
  PublicationStatus,
  VerificationStatus,
} from '../generated/prisma/enums';
import { ImportDataset } from './dataset';

export type ImportSummary = {
  hotels: number;
  notablePeople: number;
  sources: number;
  associations: number;
  destinations: number;
  videos: number;
  videoDestinations: number;
  videoHotels: number;
};

export async function importDataset(
  prisma: PrismaClient,
  dataset: ImportDataset,
): Promise<ImportSummary> {
  await prisma.$transaction(async (transaction) => {
    for (const hotel of dataset.hotels) {
      const data = {
        name: hotel.name,
        description: hotel.description ?? null,
        countryCode: hotel.countryCode,
        city: hotel.city,
        address: hotel.address ?? null,
        latitude: hotel.latitude ?? null,
        longitude: hotel.longitude ?? null,
        websiteUrl: hotel.websiteUrl ?? null,
        imageUrl: hotel.imageUrl ?? null,
        logoUrl: hotel.logoUrl ?? null,
        starRating: hotel.starRating ?? null,
        publicationStatus: hotel.publicationStatus ?? PublicationStatus.DRAFT,
      };

      await transaction.hotel.upsert({
        where: { slug: hotel.slug },
        update: data,
        create: { slug: hotel.slug, ...data },
      });
    }

    for (const person of dataset.notablePeople) {
      const data = {
        displayName: person.displayName,
        instagramHandle: person.instagramHandle ?? null,
        primaryCategory: person.primaryCategory,
        occupation: person.occupation ?? null,
        followerCount: person.followerCount ?? null,
        biography: person.biography ?? null,
        countryCode: person.countryCode ?? null,
        imageUrl: person.imageUrl ?? null,
        publicationStatus: person.publicationStatus ?? PublicationStatus.DRAFT,
      };

      await transaction.notablePerson.upsert({
        where: { slug: person.slug },
        update: data,
        create: { slug: person.slug, ...data },
      });
    }

    for (const source of dataset.sources) {
      const data = {
        type: source.type,
        title: source.title,
        publisher: source.publisher ?? null,
        author: source.author ?? null,
        publishedAt: toDate(source.publishedAt),
        archivedUrl: source.archivedUrl ?? null,
      };

      await transaction.source.upsert({
        where: { url: source.url },
        update: data,
        create: { url: source.url, ...data },
      });
    }

    for (const association of dataset.associations) {
      const verificationStatus =
        association.verificationStatus ?? VerificationStatus.PENDING;
      const associationData = {
        type: association.type,
        summary: association.summary,
        occurredAt: toDate(association.occurredAt),
        verificationStatus,
        verificationNotes: association.verificationNotes ?? null,
        verifiedAt:
          verificationStatus === VerificationStatus.VERIFIED
            ? toDate(association.verifiedAt)
            : null,
        hotel: { connect: { slug: association.hotelSlug } },
        notablePerson: {
          connect: { slug: association.notablePersonSlug },
        },
      };
      const evidenceCreate = association.evidence.map((evidence) => ({
        isPrimary: evidence.isPrimary ?? false,
        note: evidence.note ?? null,
        source: { connect: { url: evidence.sourceUrl } },
      }));

      await transaction.hotelAssociation.upsert({
        where: { referenceKey: association.referenceKey },
        update: {
          ...associationData,
          evidence: {
            deleteMany: {},
            create: evidenceCreate,
          },
        },
        create: {
          referenceKey: association.referenceKey,
          ...associationData,
          evidence: { create: evidenceCreate },
        },
      });
    }

    await transaction.destination.updateMany({
      data: { displayOrder: null },
    });

    for (const destination of dataset.destinations.filter(
      ({ type }) => type === DestinationType.PROVINCE,
    )) {
      const data = destinationData(destination);
      await transaction.destination.upsert({
        where: {
          type_slug: { type: destination.type, slug: destination.slug },
        },
        update: data,
        create: { type: destination.type, slug: destination.slug, ...data },
      });
    }

    for (const destination of dataset.destinations.filter(
      ({ type }) => type === DestinationType.CITY,
    )) {
      const parentProvince = destination.parentProvinceSlug
        ? await transaction.destination.findUnique({
            where: {
              type_slug: {
                type: DestinationType.PROVINCE,
                slug: destination.parentProvinceSlug,
              },
            },
            select: { id: true },
          })
        : null;
      const data = {
        ...destinationData(destination),
        parentProvinceId: parentProvince?.id ?? null,
      };
      await transaction.destination.upsert({
        where: {
          type_slug: { type: destination.type, slug: destination.slug },
        },
        update: data,
        create: { type: destination.type, slug: destination.slug, ...data },
      });
    }

    for (const video of dataset.videos) {
      const videoData = {
        ...(video.videoCategory !== undefined
          ? { videoCategory: video.videoCategory }
          : {}),
        ...(video.instagramUsername !== undefined
          ? { instagramUsername: video.instagramUsername }
          : {}),
        ...(video.platform !== undefined ? { platform: video.platform } : {}),
        ...(video.personCategory !== undefined
          ? { personCategory: video.personCategory }
          : {}),
        ...(video.contentType !== undefined
          ? { contentType: video.contentType }
          : {}),
        ...(video.sourceUrl !== undefined
          ? { sourceUrl: video.sourceUrl }
          : {}),
        ...(video.title !== undefined ? { title: video.title } : {}),
        ...(video.placeName !== undefined
          ? { placeName: video.placeName }
          : {}),
        ...(video.placeType !== undefined
          ? { placeType: video.placeType }
          : {}),
        ...(video.publishedDate !== undefined
          ? { publishedDate: video.publishedDate }
          : {}),
        ...(video.captionSummary !== undefined
          ? { captionSummary: video.captionSummary }
          : {}),
        ...(video.evidenceType !== undefined
          ? { evidenceType: video.evidenceType }
          : {}),
        ...(video.verificationStatus !== undefined
          ? { verificationStatus: video.verificationStatus }
          : {}),
        ...(video.notes !== undefined ? { notes: video.notes } : {}),
        ...(video.mediaUrl !== undefined ? { mediaUrl: video.mediaUrl } : {}),
        ...(video.thumbnailUrl !== undefined
          ? { thumbnailUrl: video.thumbnailUrl }
          : {}),
        ...(video.publicationStatus !== undefined
          ? { publicationStatus: video.publicationStatus }
          : {}),
      };
      await transaction.video.upsert({
        where: { id: video.id },
        update: videoData,
        create: { id: video.id, ...videoData },
      });

      if (video.destinationRefs !== undefined) {
        await transaction.videoDestination.deleteMany({
          where: { videoId: video.id },
        });
        for (const destinationRef of video.destinationRefs) {
          const destination = await transaction.destination.findUniqueOrThrow({
            where: {
              type_slug: {
                type: destinationRef.type,
                slug: destinationRef.slug,
              },
            },
            select: { id: true },
          });
          await transaction.videoDestination.create({
            data: { videoId: video.id, destinationId: destination.id },
          });
        }
      }

      if (video.hotelSlugs !== undefined) {
        await transaction.videoHotel.deleteMany({
          where: { videoId: video.id },
        });
        for (const hotelSlug of video.hotelSlugs) {
          const hotel = await transaction.hotel.findUniqueOrThrow({
            where: { slug: hotelSlug },
            select: { id: true },
          });
          await transaction.videoHotel.create({
            data: { videoId: video.id, hotelId: hotel.id },
          });
        }
      }
    }
  });

  return {
    hotels: dataset.hotels.length,
    notablePeople: dataset.notablePeople.length,
    sources: dataset.sources.length,
    associations: dataset.associations.length,
    destinations: dataset.destinations.length,
    videos: dataset.videos.length,
    videoDestinations: dataset.videos.reduce(
      (total, video) => total + (video.destinationRefs?.length ?? 0),
      0,
    ),
    videoHotels: dataset.videos.reduce(
      (total, video) => total + (video.hotelSlugs?.length ?? 0),
      0,
    ),
  };
}

function destinationData(destination: ImportDataset['destinations'][number]) {
  return {
    name: destination.name,
    description: destination.description ?? null,
    imageUrl: destination.imageUrl ?? null,
    isFeatured: destination.isFeatured ?? false,
    displayOrder: destination.displayOrder ?? null,
    primarySourceUrl: destination.primarySourceUrl ?? null,
    sourceType: destination.sourceType ?? null,
    notes: destination.notes ?? null,
    publicationStatus: destination.publicationStatus ?? PublicationStatus.DRAFT,
  };
}

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}
