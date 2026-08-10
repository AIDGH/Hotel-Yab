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
- `firstName` and `lastName`;
- `role` (`USER`, `MODERATOR`, `ADMIN`);
- `status` (`ACTIVE`, `BLOCKED`);
- optional unique `notablePersonId`, set only after administrative verification.

Follower count is not collected from regular users. Public notable-person data
continues to live in `NotablePerson`.

No public or private API response exposes `passwordHash`. New registrations
require username and password; legacy accounts are prompted to complete both
after OTP login.

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
optional.

`moderatedById` and `moderatedAt` preserve who made the latest moderation
decision and when. `moderationNote` is internal and is never returned publicly.

## Video

`Video` is the canonical database identity used by interactive features. It
does not duplicate person, destination, source, or media metadata from the
current travel-video prototype. Video IDs are imported from the same dataset so
comments cannot attach to an arbitrary unknown video.

## VideoComment

`VideoComment` belongs to a user and video. Optional `parentId` supports a
single reply level enforced by the service. Public reads return only comments
with status `PUBLISHED`. The latest moderation decision uses the same
moderator/time/note fields as hotel reviews.

`HotelReview` and `VideoComment` share `ContentModerationStatus`:

```text
PENDING
PUBLISHED
REJECTED
HIDDEN
```

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
- list contribution moderation queues by status and persist the moderator audit fields.

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

- Favorite
- Saved Hotel

## Moderation History

The latest moderator identity, timestamp, and note are implemented on each
review/comment. A separate append-only history table remains a possible future
extension if every transition must be audited rather than only the latest one.

## Data Sync

Future metadata may be required for the spreadsheet-to-database sync process, such as:

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
