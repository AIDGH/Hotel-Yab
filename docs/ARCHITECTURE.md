# Hotel-Yab Architecture

## Overview

Hotel-Yab is a web application for discovering hotels through documented relationships with notable people.

Current architecture:

```text
User / Browser
      ↓
Next.js Frontend
      ↓
Backend API
      ↓
Prisma ORM
      ↓
PostgreSQL
```

The frontend never connects directly to the database.

---

## Repository Structure

```text
Hotel-Yab/
├── apps/
│   ├── web/        # Next.js frontend
│   └── api/        # Backend API
├── docs/           # Project documentation
├── PROJECT_CONTEXT.md
└── package.json
```

The project is maintained as a monorepo.

---

## Frontend

Location:

```text
apps/web/
```

Technology:

- Next.js
- React
- TypeScript

Main responsibilities:

- rendering public pages;
- hotel and notable-person listings;
- search and filtering;
- pagination;
- hotel and person cards;
- RTL Persian interface;
- displaying images and public metadata;
- maintaining client authentication state and the account modal, including closing the account menu after route changes;
- rendering the responsive account sidebar, optional avatar controls, and compact profile form;
- rendering hotel reviews and collapsed-on-demand video comments;
- rendering the authenticated user's review/comment activity and ownership actions;
- rendering shared hotel/person like-save controls and the private account library;
- communicating with the backend API.

Server-rendered data uses the internal `API_BASE_URL`. Browser-side account,
review, and comment requests default to same-origin `/api/v1`; a Next.js rewrite
proxies those requests to the internal API. This avoids exposing a browser-side
`localhost:4000` URL and keeps session cookies on the frontend host when the
site is opened through a LAN IP.

Main routes currently include:

```text
/
/hotels
/hotels/[slug]
/notable-people
/notable-people/[slug]
/destinations
/destinations/[type]/[slug]
/explore
/search
/account
/account/activity
/account/library
/admin/catalog
```

Frontend data access is handled through functions such as:

```text
getHotels(...)
getNotablePeople(...)
```

Database logic must not be implemented inside frontend components.

---

## Backend

Location:

```text
apps/api/
```

Technology:

- Node.js
- TypeScript
- Prisma ORM

Main responsibilities:

- exposing HTTP APIs;
- validating request parameters;
- applying filtering and publication rules;
- issuing and verifying OTP challenges and session cookies;
- accepting moderated hotel reviews and video comments;
- pagination;
- querying application data;
- communicating with PostgreSQL through Prisma.

Data flow:

```text
Frontend
   ↓
Backend API
   ↓
Prisma
   ↓
PostgreSQL
```

---

## Database

Primary database:

```text
PostgreSQL
```

Database access layer:

```text
Prisma ORM
```

Prisma schema:

```text
apps/api/prisma/schema.prisma
```

Core domain concepts currently include:

- Hotel
- Notable Person
- Hotel–Person Association
- User, User Avatar, User Session, and OTP Challenge
- Hotel Review
- Video and Video Comment
- Destination, VideoDestination, and VideoHotel
- Moderation decisions linked back to a moderator account

Conceptually:

```text
Hotel
  ↕
Association
  ↕
Notable Person
```

The association represents a documented relationship between a hotel and a notable person.

The existence of data in the database does not automatically mean that it should be publicly displayed. Publication and verification rules are documented separately in `DATA_POLICY.md`.

---

## Main Data Flow

Example hotel listing request:

```text
User opens /hotels
        ↓
Next.js reads filters and page parameters
        ↓
Frontend calls getHotels(...)
        ↓
Backend API receives the request
        ↓
Prisma queries PostgreSQL
        ↓
Backend returns hotel data + pagination metadata
        ↓
Frontend renders HotelCard components
```

The notable-person listing follows the same general architecture.

Global search is currently federated in the Next.js server route:

```text
/search?query=...
      ├── getHotels(query) ─────────────> Hotel API / PostgreSQL
      ├── getNotablePeople(query) ──────> Person API / PostgreSQL
      └── getDestinations() ────────────> Destination API / PostgreSQL
```

Results are grouped by canonical entity type. A failure in one API-backed
group does not suppress destination results or another available group.

---

## Search and Pagination

Public listing pages use URL parameters for filtering and pagination.

Hotels may use parameters such as:

```text
query
city
countryCode
sort = NAME_ASC | CITY_ASC
page
```

Notable people may use:

```text
query
category
countryCode
sort = FOLLOWERS_DESC | NAME_ASC | HOTEL_COUNT_DESC
page
```

The backend returns pagination metadata such as:

```text
total
totalPages
```

The frontend uses this information to render previous/next page navigation while preserving active filters.

---

## Media

Destination images and travel-video files remain under the existing frontend
`public` paths for now. PostgreSQL stores only their stable `imageUrl`,
`mediaUrl`, and `thumbnailUrl`; moving binaries to object storage is a separate
deployment concern and does not require changing page composition.

The transition JSON files remain available as idempotent import inputs, but
public destination and travel-video pages now read the API rather than importing
those JSON files directly.

Hotel-Yab currently supports images for:

- hotels;
- optional hotel logos;
- notable people.

The frontend handles media rendering and fallback states. Hotel logos are
stored separately from the main image through `logoUrl`, so the same logo can
be shown consistently on cards and detail pages.

Future content enrichment may include:

- Instagram links;
- external source links;
- additional media related to hotel-person associations.

Travel discovery now uses normalized API-backed data:

```text
NotablePerson API (exact instagramHandle)
        ↑
TravelVideo.instagramUsername
        ↓
VideoDestination (PostgreSQL)
        ↓
Destination (PostgreSQL)
```

`Video` stores identity, normalized content metadata, media URLs, `sourceUrl`,
and publication/verification state. Person metadata comes from the existing
notable-person API, while destination labels and links come from `Destination`.
One video may resolve to multiple destinations. City/province display-order
values remain scoped independently.

Destination detail pages also resolve hotels through the existing hotel API:

```text
City destination.name ──exact city filter──> Hotel API

Province Destination.id
        ↓
Destination cities[parentProvinceId]
        ↓
exact city filters ──deduplicate by hotel.id──> HotelCard
```

Hotel records remain canonical in PostgreSQL/API and are not copied into
destination records. A province result covers its canonical child cities.

`/explore` reads the same normalized travel-video relationships and composes
each result from the existing creator header, `TravelVideoCard`, and destination
link components. Search and destination filters operate on resolved video
relationships; person and destination metadata are not copied into video data.

---

## Current Architecture

Implemented today:

```text
Next.js Frontend
        ↓
Backend API
        ↓
Prisma ORM
        ↓
PostgreSQL
```

Current capabilities include:

- hotel listing;
- notable-person listing;
- search and filtering;
- pagination;
- reusable hotel/person cards;
- destination detail pages with related hotel cards below travel videos;
- filtered travel-video Explore page with creator and multi-destination context
  plus client-side progressive reveal in batches of six;
- federated global search across hotels, notable people, cities, and provinces;
- displaying hotel-person relationship data;
- optional verified registration plus password/OTP login;
- editable user profiles;
- aggregated account activity for the current user's hotel reviews and video comments;
- moderated hotel ratings/reviews;
- collapsed video comments with hybrid trust/risk moderation and rate limiting;
- user reports with automatic hiding at the unique-report threshold;
- protected review/comment/report moderation queues and admin user blocking.

---

## Planned Architecture

The following components are planned but are not yet part of the stable architecture.

### Data Sync Pipeline

Planned flow:

```text
Research Data / Spreadsheet
           ↓
Normalization
           ↓
Sync Script
           ↓
PostgreSQL
           ↓
Website
```

### User System

Implemented authentication flows:

```text
Register: Mobile → OTP Challenge → Verify + unique username/password → User → Session
Login:    Mobile/Username + Password → scrypt verification → Session
Fallback: Mobile/Username → OTP Challenge → Verify existing User → Session
```

The website keeps registration minimal: an `09…` mobile, username, and a strong
new password. Name, family name, email, Instagram, and avatar are completed
later in the account page. OTP responses drive the six-slot input and the default
60-second resend countdown; the API enforces the same cooldown.

The public site remains usable without authentication. Authenticated writes use
the session guard, and public reads expose only published user-generated
content. Passwords are stored only as salted hashes, while the raw opaque
session token exists only in the HttpOnly cookie. Current capabilities include
user profiles with separately stored avatars, hotel reviews, video comments, an aggregated account activity
view on `/account/activity`, and independent hotel/person likes and saves shown
on `/account/library`. A single authenticated frontend provider loads the four
library sets once and supplies card/detail controls, avoiding one request per
rendered entity. The activity API returns only
the current user's contributions, including
non-public moderation states, and never exposes private moderation notes. The UI
can delete the user's hotel review through the existing hotel endpoint or delete
a video comment only while it has no replies. Future extensions include:

- personalized discovery;

### Admin and Moderation

The current protected moderation layer supports:

- an `ADMIN`/`MODERATOR` guard;
- queues for hotel reviews and video comments by status plus unresolved reports;
- publish, reject, hide, and return-to-pending actions;
- private notes plus moderator identity and decision timestamps;
- hybrid comment classification after two published comments, plus simple risk signals;
- a five-comments-per-minute per-user limit;
- automatic hiding after three independent unresolved reports;
- administrator-only user blocking/reactivation with session revocation.
- administrator-only permanent deletion controls for published hotel reviews
  and video comments/replies, exposed beside public content with an inline
  confirmation step.

The administration layer is split by responsibility:

- `/admin/moderation` is available to `ADMIN` and `MODERATOR` for user content;
- `/admin/catalog` is restricted to `ADMIN` and creates canonical destination,
  hotel, notable-person, and categorized `TRAVEL`/`HOTEL` video records directly
  in PostgreSQL;
- the catalog video form provides searchable click-to-toggle multi-selection,
  generates editable media-path suggestions from stable slugs, offers
  initially empty free-typing datalist suggestions for content/place/creator
  categories, provides searchable single-selection for the existing creator,
  and creates the selected many-to-many destination/hotel links while keeping
  the original source URL;
- selecting a hotel for a published, non-rejected video also creates a pending
  person–hotel association when that pair does not already exist, inside the
  same video-creation transaction;
- a read-only export endpoint produces a JSON snapshot compatible with the
  extended import schema.

The administration layer may later expand to:

- reviewing records;
- verifying associations;
- editing existing records and managing publication status;
- reviewing submitted sources.

The first admin role is bootstrapped with the local `user:set-role` command;
role-management UI is not implemented yet.

---

## Architectural Boundaries

### Frontend

Responsible for:

- UI;
- rendering;
- navigation;
- frontend API calls;
- composing published hotel-linked videos into the matching notable-person
  association card by normalized Instagram handle;
- collapsed comment loading, report forms, and moderation/admin controls.

Must not contain:

- Prisma queries;
- direct PostgreSQL access;
- data-ingestion logic.

### Backend

Responsible for:

- APIs;
- business rules;
- validation;
- publication filtering;
- authentication and authorization;
- moderation-state enforcement for user-generated content;
- comment trust/risk classification, rate limiting, report thresholds, and account blocking;
- database queries.

### Database Layer

Responsible for:

- persistent data;
- relationships;
- constraints;
- schema migrations.

### Data Pipeline

Future ingestion logic should be responsible for:

```text
Raw Data
   ↓
Normalization
   ↓
Validation
   ↓
Database
```

and remain separate from the public frontend.

---

## Documentation Boundaries

Detailed documentation is separated into:

- `ARCHITECTURE.md` — system structure
- `DECISIONS.md` — why important decisions were made
- `API.md` — API contracts
- `DATABASE.md` — database models and relationships
- `DATA_POLICY.md` — sourcing, verification, and publication rules
- `CHANGELOG.md` — project changes
- `TODO.md` — remaining work

---

## Architecture Principles

1. Frontend, backend, database, and ingestion responsibilities remain separated.
2. The frontend accesses application data through the backend API.
3. PostgreSQL access is handled through Prisma.
4. Reusable UI patterns should be implemented as shared components.
5. Search, filters, and pagination should use URL parameters where appropriate.
6. Stored data is not automatically considered publishable data.
7. Authentication remains optional for reading; only account-specific writes require a valid session.
8. New subsystems such as automated sync should be added incrementally as the product requires them.
