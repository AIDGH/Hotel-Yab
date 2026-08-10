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
- maintaining client authentication state and the account modal;
- rendering hotel reviews and collapsed-on-demand video comments;
- communicating with the backend API.

Main routes currently include:

```text
/
/hotels
/hotels/[slug]
/notable-people
/notable-people/[slug]
/destinations
/destinations/[type]/[slug]
/account
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
- User, User Session, and OTP Challenge
- Hotel Review
- Video and Video Comment
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

Travel discovery currently uses normalized frontend prototype data:

```text
NotablePerson API (exact instagramHandle)
        ↑
TravelVideo.instagramUsername
        ↓
VideoDestinations
        ↓
destinations.json (city/province records)
```

`travel-videos.json` stores video identity, media URLs, `sourceUrl`, and
relationship keys only. Person metadata comes from the existing notable-person
API, while destination labels and links come from `destinations.json`. One
video may resolve to multiple destinations.

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
- displaying hotel-person relationship data.
- optional verified registration plus password/OTP login;
- editable user profiles;
- moderated hotel ratings/reviews;
- moderated, collapsed video comments.
- protected review/comment moderation queues.

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

The public site remains usable without authentication. Authenticated writes use
the session guard, and public reads expose only published user-generated
content. Passwords are stored only as salted hashes, while the raw opaque
session token exists only in the HttpOnly cookie. Current capabilities include
user profiles, hotel reviews, and video comments. Future extensions include:

- saved hotels;
- favorites;
- personalized discovery;
- an aggregated account activity view.

### Admin and Moderation

The current protected moderation layer supports:

- an `ADMIN`/`MODERATOR` guard;
- queues for hotel reviews and video comments by status;
- publish, reject, hide, and return-to-pending actions;
- private notes plus moderator identity and decision timestamps.

The administration layer may later expand to:

- reviewing records;
- verifying associations;
- managing publication status;
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
- frontend API calls.

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
