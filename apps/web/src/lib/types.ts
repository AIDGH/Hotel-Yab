export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type HotelListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  countryCode: string;
  city: string;
  imageUrl: string | null;
  logoUrl: string | null;
  starRating: number | null;
  associationCount: number;
  verifiedAssociationCount: number;
};

export type NotablePersonListItem = {
  id: string;
  slug: string;
  displayName: string;
  instagramHandle: string | null;
  primaryCategory: string;
  occupation: string | null;
  followerCount: number | null;
  countryCode: string | null;
  imageUrl: string | null;
  associationCount: number;
  verifiedAssociationCount: number;
};

export type EvidenceSource = {
  id: string;
  url: string;
  type: string;
  title: string;
  publisher: string | null;
  author: string | null;
  publishedAt: string | null;
  archivedUrl: string | null;
  isPrimary: boolean;
  note: string | null;
};

export type PublicAssociation = {
  id: string;
  type: string;
  summary: string;
  occurredAt: string | null;
  verificationStatus: string;
  verifiedAt: string | null;
  sources: EvidenceSource[];
};

export type HotelDetail = Omit<
  HotelListItem,
  "associationCount" | "verifiedAssociationCount"
> & {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  websiteUrl: string | null;
  ratingSummary: {
    averageRating: number | null;
    reviewCount: number;
  };
  associations: Array<
    PublicAssociation & {
      notablePerson: Omit<
        NotablePersonListItem,
        "associationCount" | "verifiedAssociationCount" | "countryCode"
      >;
    }
  >;
};

export type NotablePersonDetail = Omit<
  NotablePersonListItem,
  "associationCount" | "verifiedAssociationCount"
> & {
  biography: string | null;
  associations: Array<
    PublicAssociation & {
      hotel: Pick<
        HotelListItem,
        "id" | "slug" | "name" | "countryCode" | "city" | "imageUrl" | "logoUrl"
      >;
    }
  >;
};

export type ApiEnvelope<T> = { data: T };

export type ApiResult<T> =
  { ok: true; value: T } | { ok: false; status?: number; message: string };
