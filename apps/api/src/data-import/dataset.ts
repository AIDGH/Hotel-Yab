import Joi from 'joi';
import {
  AssociationType,
  ContentKind,
  ContentMediaType,
  DestinationType,
  NotablePersonCategory,
  PublicationStatus,
  SourceType,
  VerificationStatus,
  VideoCategory,
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
  logoUrl?: string | null;
  starRating?: number | null;
  publicationStatus?: PublicationStatus;
};

export type NotablePersonImportRecord = {
  slug: string;
  displayName: string;
  instagramHandle?: string | null;
  primaryCategory: NotablePersonCategory;
  occupation?: string | null;
  followerCount?: number | null;
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

export type VideoImportRecord = {
  id: string;
  videoCategory?: VideoCategory;
  contentKind?: ContentKind;
  instagramUsername?: string | null;
  platform?: string | null;
  personCategory?: string | null;
  contentType?: string | null;
  sourceUrl?: string | null;
  title?: string | null;
  placeName?: string | null;
  placeType?: string | null;
  publishedDate?: string | null;
  captionSummary?: string | null;
  evidenceType?: string | null;
  verificationStatus?: VerificationStatus;
  notes?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaItems?: Array<{
    mediaType: ContentMediaType;
    mediaUrl: string;
    thumbnailUrl?: string | null;
  }>;
  publicationStatus?: PublicationStatus;
  destinationRefs?: Array<{ type: DestinationType; slug: string }>;
  hotelSlugs?: string[];
};

export type DestinationImportRecord = {
  type: DestinationType;
  slug: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  parentProvinceSlug?: string | null;
  isFeatured?: boolean;
  displayOrder?: number | null;
  primarySourceUrl?: string | null;
  sourceType?: string | null;
  notes?: string | null;
  publicationStatus?: PublicationStatus;
};

export type ImportDataset = {
  hotels: HotelImportRecord[];
  notablePeople: NotablePersonImportRecord[];
  sources: SourceImportRecord[];
  associations: AssociationImportRecord[];
  destinations: DestinationImportRecord[];
  videos: VideoImportRecord[];
};

const optionalText = Joi.string().trim().allow(null);
const optionalUrl = Joi.string()
  .trim()
  .pattern(/^https?:\/\/\S+$/i)
  .allow(null);
const optionalIsoDate = Joi.string().isoDate().allow(null);
const optionalMediaPath = Joi.string()
  .trim()
  .pattern(/^(?:\/(?!\/)\S*|https?:\/\/\S+)$/i)
  .allow(null);

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
        imageUrl: optionalMediaPath,
        logoUrl: optionalMediaPath,
        starRating: Joi.number().integer().min(1).max(5).allow(null),
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
        followerCount: Joi.number().integer().min(0).allow(null),
        biography: optionalText,
        countryCode: Joi.string()
          .pattern(countryCodePattern)
          .length(2)
          .allow(null),
        imageUrl: optionalMediaPath,
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
          .trim()
          .pattern(/^https?:\/\/\S+$/i)
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
                .trim()
                .pattern(/^https?:\/\/\S+$/i)
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
  destinations: Joi.array()
    .items(
      Joi.object<DestinationImportRecord>({
        type: Joi.string()
          .valid(...Object.values(DestinationType))
          .required(),
        slug: Joi.string().pattern(slugPattern).max(160).required(),
        name: Joi.string().trim().min(1).max(200).required(),
        description: optionalText,
        imageUrl: optionalMediaPath,
        parentProvinceSlug: Joi.string()
          .pattern(slugPattern)
          .max(160)
          .allow(null),
        isFeatured: Joi.boolean().default(false),
        displayOrder: Joi.number().integer().min(1).allow(null),
        primarySourceUrl: optionalUrl,
        sourceType: Joi.string().trim().max(60).allow(null),
        notes: optionalText,
        publicationStatus: Joi.string().valid(
          ...Object.values(PublicationStatus),
        ),
      }).unknown(false),
    )
    .unique(
      (a: DestinationImportRecord, b: DestinationImportRecord) =>
        a.type === b.type && a.slug === b.slug,
    )
    .default([]),
  videos: Joi.array()
    .items(
      Joi.object<VideoImportRecord>({
        id: Joi.string().trim().min(1).max(160).required(),
        videoCategory: Joi.string().valid(...Object.values(VideoCategory)),
        contentKind: Joi.string().valid(...Object.values(ContentKind)),
        instagramUsername: Joi.string()
          .trim()
          .pattern(/^[A-Za-z0-9._]+$/)
          .max(30)
          .allow(null),
        platform: Joi.string().trim().max(30).allow(null),
        personCategory: Joi.string().trim().max(40).allow(null),
        contentType: Joi.string().trim().max(40).allow(null),
        sourceUrl: optionalUrl,
        title: Joi.string().trim().max(240).allow(null),
        placeName: Joi.string().trim().max(200).allow(null),
        placeType: Joi.string().trim().max(40).allow(null),
        publishedDate: Joi.string().trim().max(20).allow(null),
        captionSummary: optionalText,
        evidenceType: Joi.string().trim().max(40).allow(null),
        verificationStatus: Joi.string().valid(
          ...Object.values(VerificationStatus),
        ),
        notes: optionalText,
        mediaUrl: optionalMediaPath,
        thumbnailUrl: optionalMediaPath,
        mediaItems: Joi.array()
          .items(
            Joi.object({
              mediaType: Joi.string()
                .valid(...Object.values(ContentMediaType))
                .required(),
              mediaUrl: Joi.string()
                .trim()
                .pattern(/^(?:\/(?!\/)\S*|https?:\/\/\S+)$/i)
                .required(),
              thumbnailUrl: optionalMediaPath,
            }).unknown(false),
          )
          .min(1),
        publicationStatus: Joi.string().valid(
          ...Object.values(PublicationStatus),
        ),
        destinationRefs: Joi.array().items(
          Joi.object({
            type: Joi.string()
              .valid(...Object.values(DestinationType))
              .required(),
            slug: Joi.string().pattern(slugPattern).max(160).required(),
          }).unknown(false),
        ),
        hotelSlugs: Joi.array().items(
          Joi.string().pattern(slugPattern).max(160),
        ),
      }).unknown(false),
    )
    .unique('id')
    .default([]),
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
  const personInstagramHandles = new Set(
    dataset.notablePeople
      .map(({ instagramHandle }) => instagramHandle?.toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );
  const sourceUrls = new Set(dataset.sources.map(({ url }) => url));
  const destinationKeys = new Set(
    dataset.destinations.map(({ type, slug }) => `${type}:${slug}`),
  );
  const provinceSlugs = new Set(
    dataset.destinations
      .filter(({ type }) => type === DestinationType.PROVINCE)
      .map(({ slug }) => slug),
  );

  for (const destination of dataset.destinations) {
    if (
      destination.type === DestinationType.CITY &&
      destination.parentProvinceSlug &&
      !provinceSlugs.has(destination.parentProvinceSlug)
    ) {
      throw new Error(
        `City "${destination.slug}" references unknown province "${destination.parentProvinceSlug}"`,
      );
    }
  }

  for (const video of dataset.videos) {
    const contentKind = video.contentKind ?? ContentKind.VIDEO;
    const mediaItems = video.mediaItems ?? [];
    if (video.contentKind && mediaItems.length === 0) {
      throw new Error(
        `Content "${video.id}" requires at least one ordered media item`,
      );
    }
    if (
      mediaItems.length > 0 &&
      contentKind === ContentKind.VIDEO &&
      (mediaItems.length !== 1 ||
        mediaItems[0].mediaType !== ContentMediaType.VIDEO)
    ) {
      throw new Error(
        `Content "${video.id}" of kind VIDEO requires exactly one video item`,
      );
    }
    if (
      video.instagramUsername &&
      !personInstagramHandles.has(video.instagramUsername.toLowerCase())
    ) {
      throw new Error(
        `Video "${video.id}" references unknown Instagram username "${video.instagramUsername}"`,
      );
    }
    for (const destination of video.destinationRefs ?? []) {
      if (!destinationKeys.has(`${destination.type}:${destination.slug}`)) {
        throw new Error(
          `Video "${video.id}" references unknown destination "${destination.type}:${destination.slug}"`,
        );
      }
    }
    for (const hotelSlug of video.hotelSlugs ?? []) {
      if (!hotelSlugs.has(hotelSlug)) {
        throw new Error(
          `Video "${video.id}" references unknown hotel "${hotelSlug}"`,
        );
      }
    }
  }

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
