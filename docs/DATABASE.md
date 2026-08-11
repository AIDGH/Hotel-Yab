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
- follower count snapshot (`followerCount`);
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
The API accepts JPEG, PNG, or WebP up to 1 MB and returns only a versioned
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
sessions are ignored and may be deleted during later login.

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

`Video` is the canonical database record used by discovery and interactive
features. It stores the normalized Instagram username, original `sourceUrl`,
display metadata, media paths, verification status, and publication status.
`VideoComment` uses the same stable ID, so comments cannot attach to an
arbitrary unknown video. Person profile fields are still resolved from
`NotablePerson` and are not copied into the video.

## Destination, VideoDestination, and VideoHotel

`Destination` represents either a `CITY` or `PROVINCE`. `(type, slug)` is
unique, and a city may point to a parent province through a self-relation.
Display order is unique within each type, keeping city and province sequences
independent.

`VideoDestination` connects one video to any number of cities/provinces.
`VideoHotel` optionally connects a video to hotels. Composite primary keys
prevent duplicate links, and both relations cascade with their canonical rows.

## VideoComment

`VideoComment` belongs to a user and video. Optional `parentId` supports a
single reply level enforced by the service. Public reads return only comments
with status `PUBLISHED`. The latest moderation decision uses the same
moderator/time/note fields as hotel reviews.

Clean comments from users with at least two published comments may start as
`PUBLISHED`; new users, exact
repeats, links, and baseline risky terms start as `PENDING`. Trust is derived
from the user's published-comment count rather than stored as a separate mutable
flag. First and last name remain optional for commenting; serialization falls
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

Destination and travel-video media currently keep their existing `/images/...`
and `/travel-videos/...` paths under the frontend `public` directory. Only
`imageUrl`, `mediaUrl`, and `thumbnailUrl` are stored in PostgreSQL.

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
- retrieve associated hotels.

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
- let administrators block/reactivate users and revoke sessions when blocking.

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
upserts the transition destination/video JSON, while the admin catalog exports
the full database in the extended import shape. Future bulk synchronization may
still require metadata such as:

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
