import { PrismaClient } from '../generated/prisma/client';
import {
  PublicationStatus,
  VerificationStatus,
} from '../generated/prisma/enums';
import { ImportDataset } from './dataset';

export type ImportSummary = {
  hotels: number;
  notablePeople: number;
  sources: number;
  associations: number;
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
        primaryCategory: person.primaryCategory,
        occupation: person.occupation ?? null,
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
  });

  return {
    hotels: dataset.hotels.length,
    notablePeople: dataset.notablePeople.length,
    sources: dataset.sources.length,
    associations: dataset.associations.length,
  };
}

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}
