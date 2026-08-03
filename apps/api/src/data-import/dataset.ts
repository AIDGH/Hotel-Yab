import Joi from 'joi';
import {
  AssociationType,
  NotablePersonCategory,
  PublicationStatus,
  SourceType,
  VerificationStatus,
} from '../generated/prisma/enums';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const referenceKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const countryCodePattern = /^[A-Z]{2}$/;

export type HotelImportRecord = {
  slug: string;
  name: string;
  description?: string | null;
  countryCode: string;
  city: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  websiteUrl?: string | null;
  imageUrl?: string | null;
  publicationStatus?: PublicationStatus;
};

export type NotablePersonImportRecord = {
  slug: string;
  displayName: string;
  instagramHandle?: string | null;
  primaryCategory: NotablePersonCategory;
  occupation?: string | null;
  biography?: string | null;
  countryCode?: string | null;
  imageUrl?: string | null;
  publicationStatus?: PublicationStatus;
};

export type SourceImportRecord = {
  url: string;
  type: SourceType;
  title: string;
  publisher?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  archivedUrl?: string | null;
};

export type AssociationEvidenceImportRecord = {
  sourceUrl: string;
  isPrimary?: boolean;
  note?: string | null;
};

export type AssociationImportRecord = {
  referenceKey: string;
  hotelSlug: string;
  notablePersonSlug: string;
  type: AssociationType;
  summary: string;
  occurredAt?: string | null;
  verificationStatus?: VerificationStatus;
  verificationNotes?: string | null;
  verifiedAt?: string | null;
  evidence: AssociationEvidenceImportRecord[];
};

export type ImportDataset = {
  hotels: HotelImportRecord[];
  notablePeople: NotablePersonImportRecord[];
  sources: SourceImportRecord[];
  associations: AssociationImportRecord[];
};

const optionalText = Joi.string().trim().allow(null);
const optionalUrl = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .allow(null);
const optionalIsoDate = Joi.string().isoDate().allow(null);

const datasetSchema = Joi.object<ImportDataset>({
  hotels: Joi.array()
    .items(
      Joi.object<HotelImportRecord>({
        slug: Joi.string().pattern(slugPattern).max(160).required(),
        name: Joi.string().trim().min(1).max(200).required(),
        description: optionalText,
        countryCode: Joi.string()
          .pattern(countryCodePattern)
          .length(2)
          .required(),
        city: Joi.string().trim().min(1).max(120).required(),
        address: optionalText,
        latitude: Joi.number().min(-90).max(90).allow(null),
        longitude: Joi.number().min(-180).max(180).allow(null),
        websiteUrl: optionalUrl,
        imageUrl: optionalUrl,
        publicationStatus: Joi.string().valid(
          ...Object.values(PublicationStatus),
        ),
      }).unknown(false),
    )
    .unique('slug')
    .required(),
  notablePeople: Joi.array()
    .items(
      Joi.object<NotablePersonImportRecord>({
        slug: Joi.string().pattern(slugPattern).max(160).required(),
        displayName: Joi.string().trim().min(1).max(200).required(),
        instagramHandle: Joi.string()
          .trim()
          .pattern(/^[A-Za-z0-9._]+$/)
          .max(30)
          .allow(null),
        primaryCategory: Joi.string()
          .valid(...Object.values(NotablePersonCategory))
          .required(),
        occupation: optionalText,
        biography: optionalText,
        countryCode: Joi.string()
          .pattern(countryCodePattern)
          .length(2)
          .allow(null),
        imageUrl: optionalUrl,
        publicationStatus: Joi.string().valid(
          ...Object.values(PublicationStatus),
        ),
      }).unknown(false),
    )
    .unique('slug')
    .required(),
  sources: Joi.array()
    .items(
      Joi.object<SourceImportRecord>({
        url: Joi.string()
          .uri({ scheme: ['http', 'https'] })
          .required(),
        type: Joi.string()
          .valid(...Object.values(SourceType))
          .required(),
        title: Joi.string().trim().min(1).max(300).required(),
        publisher: optionalText,
        author: optionalText,
        publishedAt: optionalIsoDate,
        archivedUrl: optionalUrl,
      }).unknown(false),
    )
    .unique('url')
    .required(),
  associations: Joi.array()
    .items(
      Joi.object<AssociationImportRecord>({
        referenceKey: Joi.string()
          .pattern(referenceKeyPattern)
          .max(200)
          .required(),
        hotelSlug: Joi.string().pattern(slugPattern).max(160).required(),
        notablePersonSlug: Joi.string()
          .pattern(slugPattern)
          .max(160)
          .required(),
        type: Joi.string()
          .valid(...Object.values(AssociationType))
          .required(),
        summary: Joi.string().trim().min(10).required(),
        occurredAt: optionalIsoDate,
        verificationStatus: Joi.string()
          .valid(...Object.values(VerificationStatus))
          .default(VerificationStatus.PENDING),
        verificationNotes: optionalText,
        verifiedAt: Joi.when('verificationStatus', {
          is: VerificationStatus.VERIFIED,
          then: Joi.string().isoDate().required(),
          otherwise: Joi.forbidden(),
        }),
        evidence: Joi.array()
          .items(
            Joi.object<AssociationEvidenceImportRecord>({
              sourceUrl: Joi.string()
                .uri({ scheme: ['http', 'https'] })
                .required(),
              isPrimary: Joi.boolean().default(false),
              note: optionalText,
            }).unknown(false),
          )
          .unique('sourceUrl')
          .required(),
      }).unknown(false),
    )
    .unique('referenceKey')
    .required(),
}).unknown(false);

export function validateDataset(input: unknown): ImportDataset {
  const result = datasetSchema.validate(input, {
    abortEarly: false,
    convert: true,
  });

  if (result.error) {
    throw new Error(`Invalid import dataset:\n${result.error.message}`);
  }

  validateReferences(result.value);
  return result.value;
}

function validateReferences(dataset: ImportDataset): void {
  const hotelSlugs = new Set(dataset.hotels.map(({ slug }) => slug));
  const personSlugs = new Set(dataset.notablePeople.map(({ slug }) => slug));
  const sourceUrls = new Set(dataset.sources.map(({ url }) => url));

  for (const association of dataset.associations) {
    if (!hotelSlugs.has(association.hotelSlug)) {
      throw new Error(
        `Association "${association.referenceKey}" references unknown hotel "${association.hotelSlug}"`,
      );
    }
    if (!personSlugs.has(association.notablePersonSlug)) {
      throw new Error(
        `Association "${association.referenceKey}" references unknown notable person "${association.notablePersonSlug}"`,
      );
    }

    if (
      association.verificationStatus === VerificationStatus.VERIFIED &&
      association.evidence.length === 0
    ) {
      throw new Error(
        `Verified association "${association.referenceKey}" requires at least one evidence source`,
      );
    }

    const primaryEvidenceCount = association.evidence.filter(
      ({ isPrimary }) => isPrimary,
    ).length;
    if (primaryEvidenceCount > 1) {
      throw new Error(
        `Association "${association.referenceKey}" has more than one primary evidence source`,
      );
    }

    for (const evidence of association.evidence) {
      if (!sourceUrls.has(evidence.sourceUrl)) {
        throw new Error(
          `Association "${association.referenceKey}" references unknown source "${evidence.sourceUrl}"`,
        );
      }
    }
  }
}
