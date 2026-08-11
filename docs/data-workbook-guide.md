# Hotel-Yab Data Workbook Guide

The private workbook is stored at `data/Hotel-Yab_Data_Workbook.xlsx`. It is
the structured working format for hotels, notable people, relationships, and
evidence. The `data/` directory is excluded from Git.

## Sheets

### Hotels

One row represents one hotel. `slug`, `name`, `countryCode`, `city`, and
`publicationStatus` are required. Keep each `slug` stable after it has been
used by an association.

Use `imageUrl` for a stable, absolute `http` or `https` image URL. Do not use a
temporary Instagram CDN URL.

Use `logoUrl` only for an optional hotel logo, separate from the main hotel
image. Local logo filenames follow `<hotel-slug>-logo.webp`.

Use `starRating` only for a reviewed official hotel classification from 1 to 5.
Leave it empty when the classification is unknown; never infer it from user
reviews or amenities.

### People

One row represents one notable person. `slug`, `displayName`,
`primaryCategory`, and `publicationStatus` are required. A person can exist
before a hotel relationship is known.

Keep `displayName` for the real public name and `instagramHandle` for the
optional Instagram username without the `@` prefix. Do not derive the handle
from `slug`; the slug is only Hotel-Yab's stable URL identifier.

Keep `occupation` limited to the person's professional role. Store the
follower snapshot in `followerCount` as a non-negative integer, or leave it
empty when unknown.

### Associations

One row represents one hotel-person relationship. `hotelSlug` and
`notablePersonSlug` must match existing rows in the other sheets.

Keep the relationship as `PENDING` while its evidence is incomplete. Use
`OTHER` when the exact relationship type is not proven. Change it to
`VERIFIED` only after a reviewed source exists and `verifiedAt` is filled.

### Sources

One row represents one evidence link attached to a relationship through
`associationReferenceKey`. Repeat a source row when the same URL supports more
than one relationship. Set only one source per relationship as `isPrimary`.

`evidenceNote` should state what the source actually proves, without making a
stronger claim than the content supports.

## Editing Rules

1. Add new records on a new row inside the existing Excel table.
2. Never identify relationships by cell color.
3. Do not change an existing slug or reference key casually.
4. Use the dropdowns for enum fields instead of typing new values.
5. Leave unknown optional cells empty; do not add placeholder URLs.
6. Normalize display counts such as `294K` or `6.5M` into numeric
   `followerCount`; follower counts are not verification evidence.

The workbook does not yet sync to PostgreSQL automatically. A reusable
workbook-to-import converter is the next data-pipeline step. Until that exists,
the workbook must be converted and validated before running
`pnpm api:data:import`.

## Destination and Travel Video Workbook

The private `../Data/HotelYab_Destinations_Data.xlsx` workbook remains a bulk
research source. Runtime destination/video data now lives in PostgreSQL. It has
three sheets:

- `Destinations`: one city or province per row;
- `TravelVideos`: one Instagram travel video per row;
- `VideoDestinations`: one video-to-city/province link per row, so a video may
  have multiple destination rows.

Destination images are not workbook fields. Derive them from the normalized
slug:

```text
PROVINCE → /images/provinces/<slug>.webp
CITY     → /images/cities/<slug>.webp
```

`display_order` is scoped by destination type: city order 1 and province order
1 are both valid. `parent_province_slug` must contain the province slug, such as
`hormozgan`, not the Persian label `هرمزگان`.

For routine additions, use `/admin/catalog`:

1. Store media as
   `apps/web/public/travel-videos/<instagram-username>/<sequence>.mp4` and
   `<sequence>-thumbnail.webp`.
2. Add any missing destination or notable person first.
3. Create the video, select all related destinations and optional hotels, and
   retain the original Instagram `sourceUrl`.
4. Use «دریافت خروجی JSON» when a complete import-compatible snapshot is
   needed; do not edit JSON and PostgreSQL independently.

The tracked transition JSON can still be imported idempotently with
`pnpm --filter @hotel-yab/api data:import-travel`. This is for migration or
recovery, not the routine add workflow. Future large batches should use a
dry-run converter/import report rather than returning to manual JSON editing.
