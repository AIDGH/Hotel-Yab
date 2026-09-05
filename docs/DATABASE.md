# Hotel-Yab Database

## Overview

Hotel-Yab uses PostgreSQL as its primary database.

Database access is handled through Prisma ORM.

```text
Backend
   ↓
Prisma
   ↓
PostgreSQL
```

Prisma schema:

```text
apps/api/prisma/schema.prisma
```

The Prisma schema is the source of truth for the exact database models, fields, enums, and relationships.

## Production Database

The first production deployment uses PostgreSQL 17 on the VPS, database
`hotel_yab`, accessed by the application through a dedicated database role.
Secrets are stored only in the production environment file and are not
documented or committed.

The initial production bootstrap applied Prisma migrations first and then
restored the canonical application data. Ephemeral local `UserSession` and
`OtpChallenge` rows were cleared during that bootstrap so local authentication
state was not carried into production.

Deployment-time production counts after the reviewed Instagram batch were:

- 18 `Hotel` records;
- 157 `NotablePerson` records;
- 35 `Destination` records;
- 38 `Video` records.

These counts are a deployment snapshot, not schema constraints.

A systemd timer creates a daily custom-format PostgreSQL backup at 03:00 UTC in
`/var/backups/hotel-yab`. Off-server backup is still pending.

---

# Core Domain

The discovery domain is centered around three main concepts:

```text
Hotel
  ↕
Association
  ↕
Notable Person
```

---

# Hotel

Represents a hotel available in Hotel-Yab.

Typical hotel information includes:

- unique identifier;
- name;
- slug;
- city;
- image;
- optional logo (`logoUrl`);
- optional official classification (`starRating`, integer 1–5);
- publication information;
- relationships with notable people.

Hotels can have multiple associations with notable people.

---

# Notable Person

Represents a notable person connected to one or more hotels.

Typical information includes:

- unique identifier;
- slug;
- display name;
- primary category;
- occupation;
- latest follower count (`followerCount`);
- nullable last successful follower refresh time (`followersUpdatedAt`);
- daily follower-history relation (`followerSnapshots`);
- biography;
- image;
- Instagram information;
- publication status.

Current high-level person categories include:

```text
ACTOR
ATHLETE
INFLUENCER
MUSICIAN
PUBLIC_FIGURE
```

`primaryCategory` is used for broad classification and filtering.

More detailed professional information belongs in `occupation`.

Example:

```text
primaryCategory = ACTOR
occupation = بازیگر و تهیه‌کننده
```

`followerCount` is the latest known successful public Instagram observation.
`followersUpdatedAt` records when that latest value was captured. A failed
collector run leaves both values unchanged.

## FollowerSnapshot

`FollowerSnapshot` stores time-series follower history for a notable person.

Important fields:

- `id`;
- `notablePersonId`;
- `followerCount`;
- `snapshotDate` (`DATE`);
- `capturedAt` (`TIMESTAMPTZ`).

Relationship:

```text
NotablePerson 1 ─────< FollowerSnapshot
```

The unique constraint on `(notablePersonId, snapshotDate)` permits at most one
snapshot per person per UTC calendar day. Reapplying the collector on the same
day updates that day's count/timestamp rather than creating a duplicate. Deleting
a person cascades to the person's follower snapshots.

The latest value remains denormalized on `NotablePerson.followerCount` for
public list sorting and display; history stays in `FollowerSnapshot`. There is
currently no public follower-history API.

The schema was introduced in migration
`20260816135826_add_follower_snapshots`.

---

# Hotel–Person Association

An Association represents a relationship between a hotel and a notable person.

Conceptually:

```text
Hotel
   ↓
Association
   ↓
Notable Person
```

This relationship is modeled separately because the relationship itself may contain information such as:

- source;
- verification state;
- evidence;
- relationship type;
- publication state;
- contextual information.

A hotel can be associated with many people.

A notable person can be associated with many hotels.

Therefore, Hotel and Notable Person have a many-to-many relationship through the Association model.

---

# User and Authentication

## User

New users are created only after successful registration-mobile OTP
verification. Important fields include:

- unique normalized `mobile`;
- unique normalized `username` (nullable only for legacy OTP-created users);
- nullable `passwordHash` containing a salted `scrypt` hash for legacy compatibility;
- optional unique `email`;
- optional unique normalized `instagramHandle`;
- optional `firstName` and `lastName` completed after registration;
- `role` (`USER`, `MODERATOR`, `ADMIN`);
- `status` (`ACTIVE`, `BLOCKED`);
- optional unique `notablePersonId`, set only after administrative verification.

Follower count is not collected from regular users. Public notable-person data
continues to live in `NotablePerson`.

No public or private API response exposes `passwordHash`. New registrations
require username and password; name and family name remain nullable profile
fields completed later. Legacy accounts are prompted to complete username and
password after OTP login.

## UserAvatar

`UserAvatar` has a one-to-zero-or-one relation with `User` and stores the
validated image bytes, MIME type, and timestamps. Keeping the binary in a
separate relation prevents normal login/profile queries from loading image data.
The API accepts common processable image formats up to 15 MB, normalizes them to
an optimized WebP of bounded dimensions, and returns only a versioned
authenticated avatar URL in the public account object. Deleting a user cascades
to the avatar row.

## User Likes and Saves

Likes and saves are intentionally independent and use four explicit join models:

- `UserHotelLike`;
- `UserSavedHotel`;
- `UserNotablePersonLike`;
- `UserSavedNotablePerson`.

Each model stores `userId`, the target entity ID, and `createdAt`. Its composite
primary key prevents duplicate state for the same user and entity, while target
and creation-time indexes support library reads. Deleting a user, hotel, or
notable person cascades to the corresponding join rows. The public status of an
entity is still evaluated when an action is written and when the private library
is read.

## UserSession

Each session belongs to a user. The database stores `tokenHash`, expiry, and
optional device metadata; it never stores the raw browser token. Expired
sessions are ignored and may be deleted during later login. Authentication also
enforces a 24-hour maximum age from `createdAt`, so legacy sessions with a longer
stored expiry cannot remain valid beyond the current policy.

## OtpChallenge

OTP challenges store a HMAC hash of the six-digit code, attempt count, expiry,
and consumption time. Codes are scoped to a normalized mobile number and are
never stored in plaintext.

---

# User-Generated Content

## HotelReview

`HotelReview` belongs to one `User` and one `Hotel`. The composite unique key
`(hotelId, userId)` permits one active review per user/hotel. `rating` is
validated as 1–5 in both the API and database constraint. Review text is
optional. When present, it must contain 3–2000 characters.

`moderatedById` and `moderatedAt` preserve who made the latest moderation
decision and when. `moderationNote` is internal and is never returned publicly.

## Video

`Video` remains the canonical content aggregate used by discovery and
interactive features so existing stable IDs and comments remain compatible. It
stores the normalized Instagram username, original `sourceUrl`, explicit
relationship category (`TRAVEL` or `HOTEL`), independent `contentKind`
(`VIDEO`, `POST`, or `STORY`), display metadata, verification status, and
publication status. Legacy `mediaUrl`/`thumbnailUrl` mirror the first media item
for compatibility with older readers.
`VideoComment` uses the same stable ID, so comments cannot attach to an
arbitrary unknown video. Person profile fields are still resolved from
`NotablePerson` and are not copied into the video.

## VideoMediaItem

`VideoMediaItem` stores the ordered media inside one canonical content record.
Its composite primary key is `(videoId, displayOrder)` and each row contains a
`mediaType` (`IMAGE` or `VIDEO`), `mediaUrl`, and optional `thumbnailUrl`.
Deleting the parent cascades to all items. Validation requires exactly one
video item for `VIDEO`; `POST` and `STORY` both accept one or more ordered
items and may mix `IMAGE` and `VIDEO` media.

## Destination, VideoDestination, and VideoHotel

`Destination` represents either a `CITY` or `PROVINCE`. `(type, slug)` is
unique, and a city may point to a parent province through a self-relation.
Display order is unique within each type, keeping city and province sequences
independent.

`VideoDestination` connects one video to any number of cities/provinces.
`VideoHotel` optionally connects a video to hotels. Composite primary keys
prevent duplicate links, and both relations cascade with their canonical rows.
Public hotel detail reads published videos through `VideoHotel`; the relation
does not duplicate or replace `HotelAssociation`. Presentation under a specific
person uses the canonical `Video.instagramUsername` and
`NotablePerson.instagramHandle` match.

Admin creation treats selected hotel links on published, non-rejected videos
as relationship evidence-in-progress: if the person–hotel pair has no
`HotelAssociation`, it creates one as `VISITED` and `PENDING` in the same
transaction. Existing associations are preserved and never duplicated by this
workflow.

## VideoComment

`VideoComment` belongs to a user and video. Optional `parentId` supports a
single reply level enforced by the service. Public reads return only comments
with status `PUBLISHED`. The latest moderation decision uses the same
moderator/time/note fields as hotel reviews.

Clean comments start as `PUBLISHED` without a prior-comment threshold; exact
repeats, links, and baseline risky terms start as `PENDING`. Staff comments
bypass premoderation. First and last name remain optional for commenting; serialization falls
back to the public label `کاربر هتل‌یاب` when both are absent. An administrator
may permanently delete a comment; deleting a parent cascades to its replies.

## VideoCommentReport

`VideoCommentReport` links one reporter to one published comment and stores a
reason, optional detail, creation time, and optional resolution audit. The
composite unique key `(commentId, reporterId)` prevents duplicate reports from
one account. Three unresolved reports from distinct accounts automatically move
the comment to `HIDDEN`; a later moderator decision resolves the open reports.

`HotelReview` and `VideoComment` share `ContentModerationStatus`:

```text
PENDING
PUBLISHED
REJECTED
HIDDEN
```

## Account Activity Queries

The account activity endpoint reads `HotelReview` and `VideoComment` by the
authenticated `userId`, newest first. Existing `(userId, createdAt)` indexes
support these queries, so this feature requires no schema change or migration.
Review rows join their canonical `Hotel`; video metadata remains outside the
database prototype and is resolved in the frontend by the canonical video ID.

Deleting a video comment first checks its owner and reply count. Parent comments
with replies are retained to avoid orphaning or destructively removing another
user's contribution.

---

# Publication Status

Database records and public records are not the same thing.

Conceptually:

```text
Database Record
      ↓
Publication Rules
      ↓
Public Website
```

A record may exist in PostgreSQL while still being hidden from the public website.

Publication rules are documented in:

```text
docs/DATA_POLICY.md
```

---

# Slugs

Hotels and notable people use slugs for public URLs.

Examples:

```text
/hotels/espinas-palace

/notable-people/ali-ouji
```

Slugs should be:

- stable;
- unique within their entity type;
- suitable for public URLs.

Internal database IDs should not be used as the primary public identifier when a slug exists.

---

# Images and Media

Hotel and notable-person records may contain image references such as:

```text
imageUrl
logoUrl (Hotel only)
```

The database stores references to media rather than the binary image itself.

Destination and content media currently keep their existing `/images/...`,
`/travel-videos/...`, and `/hotel-videos/...` paths under the frontend `public`
directory. PostgreSQL stores only path metadata on canonical records and
`VideoMediaItem`; local image, thumbnail, and video binaries are ignored by Git
and are not part of the repository or database.

Media storage strategy may change as the product evolves.

---

# Query Patterns

The database currently supports common application queries such as:

### Hotels

- list published hotels;
- search hotels;
- filter hotels by city;
- sort hotels by name or city;
- paginate hotel results;
- count hotel-person associations;
- count verified associations.

### Notable People

- list published people;
- search by name;
- filter by category;
- sort by follower count, name, or association count;
- paginate results;
- retrieve associated hotels;
- update the latest follower count/timestamp from a successful internal
  collector run;
- upsert one daily follower snapshot per person.

### Associations

- retrieve people connected to a hotel;
- retrieve hotels connected to a person;
- distinguish verified relationships from incomplete relationships.

### Accounts and Contributions

- resolve a user from a non-expired session-token hash;
- resolve login by normalized mobile or username;
- verify salted password hashes or expiring OTP challenges;
- enforce unique mobile/username/email/Instagram constraints;
- upsert one hotel review per user/hotel;
- aggregate published hotel ratings;
- list published video comments and one-level replies.
- classify new video comments using trust/risk rules and enforce the per-user rate limit;
- create unique comment reports and auto-hide comments at the report threshold;
- list contribution moderation queues plus unresolved reports and persist moderator audit fields;
- let administrators and moderators search/manage non-admin users and expose a
  separate administrator query only to moderators, revoking sessions when
  blocking.

---

# Prisma Responsibilities

Prisma is responsible for:

- typed database access;
- representing database models in TypeScript;
- querying PostgreSQL;
- managing schema migrations;
- maintaining relationships between models.

Prisma must only be used inside the backend/data layer.

The frontend must never query Prisma directly.

---

# Schema Changes

Any structural database change should be reflected in:

```text
apps/api/prisma/schema.prisma
```

Examples include:

- adding a field;
- adding a model;
- changing a relationship;
- adding an enum;
- adding a database constraint.

When required, the corresponding Prisma migration should also be created.

---

# Future Database Areas

The database may later expand to support:

## Data Sources

Structured information about sources used to verify hotel-person relationships.

## Account Extensions

Possible future entities:

- personalization signals derived from existing private likes/saves;
- named collections, only if the product requires more than the current two states.

## Moderation History

The latest moderator identity, timestamp, and note are implemented on each
review/comment. A separate append-only history table remains a possible future
extension if every transition must be audited rather than only the latest one.

## Data Sync

The private core importer remains idempotent. `data:import-travel` separately
upserts the transition destination/content JSON, including ordered
`mediaItems`, while the admin catalog exports the full database in the extended
import shape. Legacy videos without `mediaItems` are normalized to one video
item during migration/import.

Two operational ingestion tools now exist outside Prisma models:

- the Instagram follower tracker, which reads the canonical person list and
  writes successful observations through the Admin Catalog API;
- the Instagram travel finder, which crawls candidate posts, produces a human
  review workbook, and currently supports approved-row dry-run validation.

The reviewed-travel XLSX write path is implemented and has been used for the
first production batch: 32 explicitly approved travel/hotel videos were applied
through the protected Admin Catalog API. Dry-run validation remains the required
preflight for future batches. Future bulk synchronization may still require
metadata such as:

- external IDs;
- sync timestamps;
- import status;
- source dataset identifiers.

These models should only be introduced when their workflow is implemented.

---

# Database Principles

1. PostgreSQL is the primary persistent data store.
2. Prisma is the only application-level database access layer.
3. Hotel and Notable Person are connected through a separate Association model.
4. Stored data is not automatically public data.
5. Public URLs should use stable slugs.
6. The database should support verification and publication workflows.
7. Future models should be introduced only when their product workflow is defined.
8. `schema.prisma` remains the source of truth for the exact schema.
9. Raw OTP/session secrets are never persisted; only hashes are stored.
10. User-generated content is private while its moderation status is `PENDING`.
11. Time-series follower history lives in `FollowerSnapshot`; the latest value
    remains on `NotablePerson` for efficient public reads.
