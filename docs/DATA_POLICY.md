# Hotel-Yab Data Policy

## Overview

This document defines how Hotel-Yab collects, verifies, stores, and publishes data.

The main principle is:

> Data may be stored before it is ready to be publicly displayed.

---

## Data Types

Hotel-Yab currently works with:

- Hotels
- Notable people
- Hotel–person associations
- Images
- Instagram information
- Biography and occupation
- Follower-count snapshots
- External sources and evidence

---

## Data Sources

Data should come from sources that are publicly accessible.

Examples:

- official hotel websites;
- official hotel social-media pages;
- official or verified notable-person pages;
- public posts and videos;
- public news articles;
- reputable media sources;
- other publicly accessible references.

Private or unauthorized data should not be used.

---

## Association Verification

A hotel–person association should only be published when there is reasonable evidence supporting the relationship.

Examples of acceptable evidence:

- a public post showing the person at the hotel;
- an official hotel post mentioning the person;
- a public video;
- a reputable article;
- another verifiable public source.

The association record should preserve its source whenever possible.

---

## Verification Principle

Conceptually:

```text
Collected Data
      ↓
Source Review
      ↓
Structured Record
      ↓
Verification
      ↓
Publication
```

A record should not automatically become public simply because it exists in the database.

Instagram browser cookies and Instaloader sessions used by local ingestion tools
are credentials. They must remain on the operator's machine, must not be copied
into workbooks or import plans, and must never be committed to Git.

---

## Publication Status

Records may exist in different publication states.

Conceptually:

```text
Draft / Incomplete
        ↓
Reviewed
        ↓
Published
```

Only records that satisfy the current publication requirements should appear on public pages.

---

## Hotels

A hotel should have enough reliable information to be useful before publication.

Important information may include:

- name;
- slug;
- city;
- image;
- official star classification when supported by a reliable hotel or booking
  source;
- basic hotel information;
- at least one useful public reference when necessary.

Incomplete hotel records may remain stored without being publicly visible.

Official hotel stars and user-review averages are separate facts. A review
average must never be copied into the hotel's official `starRating` field.

---

## Notable People

Notable-person records may include:

- display name;
- slug;
- primary category;
- occupation;
- biography;
- image;
- Instagram handle;
- latest follower count;
- follower refresh timestamp and daily follower snapshots.

Information should be based on publicly available and reasonably reliable sources.

Primary categories should remain broad.

More specific professional information belongs in `occupation`.

---

## Images

Images should come from publicly accessible sources or sources that Hotel-Yab is permitted to use.

The database should normally store an image reference or URL rather than the original binary data.

Images should:

- represent the correct hotel or person;
- avoid obvious duplicates;
- avoid misleading or unrelated content;
- be replaced if a more reliable or higher-quality image becomes available.

For locally stored third-party media, the author, source URL, license, and any
format conversion must be recorded in `docs/MEDIA_ATTRIBUTIONS.md`. A public
webpage is not by itself permission to reuse an image.

---

## Instagram Data

Instagram information may include:

- public username;
- public profile link;
- publicly visible follower information.

Only publicly available information should be collected.

Instagram handles should be verified when possible to reduce incorrect profile matching.

`followerCount` is stored as a non-negative integer when known and remains
separate from `occupation`. It is an approximate, time-sensitive value used for
display and sorting, not evidence for a hotel-person association. Unknown counts
stay `null` rather than being guessed.

Follower refresh policy:

- counts are read only from the publicly visible Instagram profile;
- collection uses a dedicated authenticated test/browser session because the
  public web application does not expose a stable unauthenticated API contract;
- browser cookies, session state, captured request tokens, and raw GraphQL
  request dumps are local secrets and must never be committed;
- the collector processes profiles sequentially and avoids aggressive retry or
  rate-limit-evasion behavior;
- a successful read updates the latest count and `followersUpdatedAt`;
- a daily `FollowerSnapshot` records the successful observation time/count;
- a failed read does not overwrite the previous known count and does not create
  a synthetic snapshot;
- repeating the applied collector in one UTC day upserts the same person's daily
  snapshot rather than creating duplicates.

## Travel Content

Travel content must retain `sourceUrl` for the original public post. A content
record is connected to a person only when `instagramUsername` exactly matches the
normalized published `instagramHandle`; similar display names are not enough.

The canonical aggregate keeps an independent `contentKind`: `VIDEO` is exactly
one video item, while `POST` and `STORY` each contain one or more ordered
`IMAGE` or `VIDEO` items in any valid combination. Ordered files belong in
`VideoMediaItem`; person and destination metadata must not be copied into
those rows. Legacy primary media fields only mirror the first item for backward
compatibility.

Destination relationships use destination type and slug. One content record may belong
to multiple destinations, and destination/person metadata must be resolved
from their canonical records rather than copied into the content dataset.

The current Instagram travel research pipeline intentionally separates
collection from publication:

```text
Public Instagram timeline
        ↓
candidate detection
        ↓
local JSON/checkpoint
        ↓
XLSX human review
        ↓
approved-only media download + ordered local manifest
        ↓
public media preparation
        ↓
approved-row dry-run validation
        ↓
explicit `--apply`
        ↓
Admin API / PostgreSQL write
```

Only rows explicitly marked `approved` are eligible for import. `source_url`
must remain the original public Instagram post/reel URL, never a temporary CDN
URL. An unresolved city/province or a non-empty unresolved hotel blocks the row;
the importer must not silently invent destinations or hotels. A blank hotel is
valid travel content and creates no `VideoHotel`. A reviewed hotel value changes
the intended media class to `/hotel-videos/...`; otherwise the media belongs
under `/travel-videos/...`. Duplicate canonical `sourceUrl` values are skipped
and reported rather than re-created.

Downloaded Instagram CDN URLs are transient research inputs and must never become
canonical `sourceUrl` values. Raw approved media stays under
`tools/instagram-travel-finder/output/<username>/media/<shortcode>/` with a local
`media.json` manifest. Final files alone are provisioned under
`apps/web/public/{travel-videos,hotel-videos}/<person-slug>/`. A `VIDEO` contains
exactly one video item; `POST` and `STORY` retain every ordered image/video item
under the same canonical content record.

Direct Highlight ingestion preserves one Highlight as one `STORY` aggregate.
For hotel content, final filenames use
`<hotel-slug>-<content-index>-<item-index>`; travel Highlight filenames omit the
hotel slug. Images are normalized to WebP, videos remain MP4, video covers are
WebP, and a local manifest prevents an interrupted retry from overwriting an
unrelated existing target.
The corresponding Highlight importer must resolve the manifest person and hotel
against the canonical Admin Catalog, require explicit destination references for
travel content, validate every local media file, and require an explicit final
title. Database writes happen only with `--apply`; a prior `--dry-run` is the
normal workflow.
Curators may remove an unwanted Highlight item by deleting its downloaded media
before import. Missing items are omitted, filename gaps are preserved, and the
surviving items receive a contiguous database display order. At least one complete
media item must remain; a video whose cover alone is missing is also omitted.

Destination and full content records are now canonical in PostgreSQL. New records
created through `/admin/catalog` must keep the original public source URL,
resolve an existing notable person by normalized Instagram handle, and connect
only to existing destination/hotel IDs. Their ordered `mediaItems` must match
`contentKind`; the transition JSON files are import inputs or backups, not a
second writable runtime source.

## Destination Hotel Matching

Hotels displayed for a city destination are resolved from the published hotel
API by an exact city-name match. Hotels displayed for a province are the
deduplicated union of hotels belonging to city records whose
`parentProvinceSlug` matches that province.

Hotel names, images, logos, star ratings, and relationship counts must remain
in the canonical hotel record and must not be duplicated in destination data.
Province pages can only include reviewed city records already represented in
the canonical destination table.

---

## Biography and Occupation

Biographies should be concise and factual.

Avoid:

- unsupported claims;
- unnecessary personal details;
- speculation;
- promotional language.

Occupation should describe the person's professional role more specifically than the broad primary category.

Example:

```text
primaryCategory: ACTOR
occupation: بازیگر و تهیه‌کننده
```

---

## Sources

Whenever practical, important facts and hotel–person associations should retain their supporting source.

A source may contain:

- URL;
- platform;
- source type;
- date;
- notes;
- verification status.

Future database models may formalize these fields further.

---

## Conflicting Information

When sources disagree:

1. prefer primary or official sources;
2. prefer newer reliable information when the fact may change over time;
3. do not silently choose uncertain information;
4. keep the record unpublished if confidence is insufficient.

---

## Missing Information

Missing data should remain missing rather than being guessed.

For example:

```text
instagramHandle = null
```

is preferable to storing an unverified Instagram account.

The same principle applies to:

- images;
- occupation;
- biography;
- hotel information;
- associations.

---

## Data Updates

Information may change over time.

Examples include:

- Instagram usernames;
- follower counts and their capture timestamps;
- hotel information;
- websites;
- publication status.

When updated information is found, the structured dataset and database should be updated rather than creating unnecessary duplicate records.

Routine additions should be made through the admin catalog. JSON export is a
recoverable snapshot/import artifact and must not be edited in parallel as a
second source of truth.

---

## Duplicate Prevention

Before creating a new Hotel or Notable Person, existing records should be checked.

Useful identifiers include:

- slug;
- normalized name;
- Instagram handle;
- existing external identifiers.

Duplicate associations between the same hotel and person should also be avoided.
When an administrator links a new published, non-rejected video to a hotel, the
system may create the missing person–hotel association automatically, but it
must start as `PENDING`. Draft, archived, and rejected video records cannot
expose a new public association. Video verification alone must not silently
promote the association to `VERIFIED`; normal source review rules still apply.

Destination duplicate checks use `(type, slug)` and type-scoped display order.
Video duplicate checks use the canonical ID. The original `sourceUrl` may be
shared intentionally by separate content records; the approved
Instagram importer also compares normalized titles with both the current catalog
and earlier ready rows in the same batch, assigning the first available numeric
suffix instead of overwriting an existing title. Join-table primary keys prevent
duplicate video–destination or video–hotel links.

---

## Research Spreadsheet

The research spreadsheet is a working data source, not the final public database.

Future intended flow:

```text
Research Spreadsheet
        ↓
Cleaning / Normalization
        ↓
Validation
        ↓
Sync Script
        ↓
PostgreSQL
        ↓
Publication Rules
        ↓
Website
```

Raw spreadsheet data should not bypass validation and be published directly.

Generated review workbooks and crawler output under `tools/.../output/` are
local working artifacts and are ignored by Git. Regenerating an XLSX from JSON
must not overwrite a manually reviewed workbook unless a backup is intentionally
made first. The approved-row write path is now implemented through the protected
Admin API; the first applied production batch contained 32 approved travel/hotel
videos. Dry-run remains mandatory before later batch applies.

For the private destination/video workbook, `parent_province_slug` and every
`destination_slug` must be normalized slugs rather than Persian display names.
City and province `displayOrder` values are validated independently. Destination
image URLs are derived from the normalized slug and destination type, while
video media paths follow the stable `<instagram-username>/<sequence>` naming
convention. A video row is not considered media-complete until both MP4 and
thumbnail files exist.

Content images, thumbnails, and videos under the frontend `public` media
directories are local/deployment assets and must not be committed to Git.
Source URLs, attribution, stable media paths, and verification metadata remain
versioned or stored in PostgreSQL as appropriate.

---

## Production Data and Backup Policy

Production PostgreSQL is the canonical runtime store. Development data on the
Mac and production data on the VPS are separate environments; routine production
changes should go through the Admin API/import workflow or an intentional Prisma
migration rather than replacing the production database from an arbitrary local
copy.

For a reviewed laptop-to-production catalog refresh, `pnpm api:data:export`
creates the import-compatible JSON and the production importer upserts only the
catalog domain. Existing users, sessions, hotel reviews, video comments, reports,
likes, and saves are not replaced. A production backup is required before each
bulk import.
Destination display positions are cleared and reapplied inside the same catalog
transaction, preventing temporary uniqueness collisions and guaranteeing rollback
if the imported order cannot be completed.

Content media remains outside Git. For the current VPS phase, reviewed media
binaries are provisioned separately under the stable frontend `public` media
paths and database values should prefer stable relative paths instead of
`localhost` URLs.
Media syncs must omit destructive deletion by default so production-only files
are not removed accidentally.

The VPS creates a daily custom-format PostgreSQL backup. This protects against
many application/data mistakes but not total VPS loss; an off-server backup copy
remains required before Hotel-Yab depends on the VPS as its only durable copy.

---

## User-Submitted Data

Hotel-Yab accepts hotel reviews and video comments from authenticated users.
Normal-user hotel reviews require moderation; staff reviews publish immediately.
Video comments use a risk policy: linked, repeated, or risky submissions wait
for review, while every clean submission publishes immediately. Staff comments
bypass premoderation.

Current flow:

```text
Normal Hotel Review → PENDING → PUBLISHED / REJECTED / HIDDEN
Staff Hotel Review  → PUBLISHED

Video Comment → risk/rate checks → PENDING or PUBLISHED
                                      ↓
                       reports/moderator decision → HIDDEN / REJECTED / PUBLISHED
```

- Mobile numbers and email addresses are private account data and must never be
  included in public review/comment responses. Passwords are never retained in
  plaintext or exposed by any API; only salted hashes are stored.
- Website registration collects only an Iranian `09…` mobile, username, and
  password. Name, family name, optional email, optional Instagram, and avatar
  are added later from the account page.
- Account avatars are private authenticated media in the current MVP. Common
  image inputs up to 15 MB are decoded and normalized to a bounded WebP image.
  The binary is not embedded in normal account JSON responses.
- New passwords must be 8–72 characters and include lowercase and uppercase
  Latin letters, a digit, and a non-alphanumeric symbol. Existing password
  verification remains backward-compatible; the stronger rule applies when a
  password is created or changed.
- Site usernames and optional Instagram handles are normalized and uniqueness
  protected. Instagram uniqueness still does not prove notable-person identity.
- Public contributions use the user's display name only.
- Instagram handle is optional and does not prove that a user is a notable
  person. Linking a user to `NotablePerson` requires administrative review.
- Follower count is not requested from users; notable-person follower data
  remains a separately maintained snapshot.
- Editing a review returns it to `PENDING` so previously approved text cannot be
  replaced without review.
- Comments and replies use the same hybrid rule. Two already-published comments
  establish the current trust threshold; links, exact recent repetition, and a
  conservative risky-term baseline still route the submission to `PENDING`.
- Each account can submit at most five comments in 60 seconds. This application
  limit is a minimum abuse control and does not replace infrastructure-level
  throttling in a scaled deployment.
- A user may report another user's published comment once. Three independent,
  unresolved reports hide the comment automatically pending staff review.
- Report reasons and free-text details are moderation data, not public content.
- Only administrators may block/reactivate accounts; blocking revokes current
  sessions. Moderators may decide content status but cannot block users.
- The latest moderation action records the responsible manager/moderator,
  timestamp, and an internal note; these audit fields are not public content.
- An authenticated user may view all moderation states of their own hotel
  reviews and video comments from the account activity page. Internal moderator
  notes remain private even to the content owner.
- Users may delete their own single hotel review. They may delete their own
  video comment only when it has no replies; preserving an existing reply thread
  takes precedence over destructive deletion of its parent.
- Profile names are optional for contributing a video comment. Public output
  uses `کاربر هتل‌یاب` instead of exposing mobile, username, or other private
  account identifiers when no name is present.
- Only `ADMIN` may permanently delete another user's hotel review, video
  comment, or reply from the public interface. This destructive action uses a
  confirmation step; deleting a parent comment also deletes its replies.
- Hotel/person likes and saves are private account data and are never exposed in
  public catalog responses. Only the authenticated owner may read or change
  them, and the library returns only targets that remain published.
- Like and save are separate user intentions; deleting one must not alter the
  other. Composite database keys prevent duplicate rows and entity/user deletion
  cascades remove orphaned state.

---

## Core Data Principles

1. Use publicly accessible information.
2. Do not publish unsupported hotel–person relationships.
3. Preserve sources whenever possible.
4. Missing information should not be guessed.
5. Stored data and published data are separate concepts.
6. Prefer reliable and primary sources.
7. Resolve duplicates before creating new records.
8. Conflicting information should be reviewed rather than silently overwritten.
9. Raw research data should pass through validation before publication.
10. Data quality is more important than maximizing the number of records.
11. Time-sensitive values such as follower counts should be timestamped, and a
    failed refresh must preserve the last known good value.
12. Authentication/session material used only for collection is operational
    secret state and must not enter Git or public datasets.
