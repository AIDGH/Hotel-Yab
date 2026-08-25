# Hotel-Yab Architecture

## Overview

Hotel-Yab is a web application for discovering hotels through documented relationships with notable people.

Current logical architecture:

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

Current production runtime (first VPS deployment):

```text
Browser
  ↓ HTTP :80
Nginx
  ├── /api/* ───────────────→ NestJS :4000
  └── all other routes ─────→ Next.js :3000
                                  │
                                  └── Server Components → NestJS :4000

NestJS → Prisma → PostgreSQL 17 :5432
```

Next.js, NestJS, and the database run on the same Ubuntu 24.04 VPS today.
`systemd` keeps the Web/API services alive across SSH disconnects and server
reboots. Nginx is the only public application entry point; application and
database ports are not intended to be publicly exposed.

---

## Repository Structure

```text
Hotel-Yab/
├── apps/
│   ├── web/        # Next.js frontend
│   └── api/        # Backend API
├── tools/
│   ├── instagram-travel-finder/
│   └── instagram-follower-tracker/
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
- search and filtering, including two-character debounced search and shared Persian text normalization;
- pagination;
- hotel and person cards;
- RTL Persian interface;
- displaying images and public metadata;
- maintaining client authentication state and the account modal, including mutually exclusive responsive navigation/account drawers;
- rendering a shared SVG icon system, site-owned confirmation dialogs, the responsive account sidebar, optional avatar controls, and a wide two-column profile form;
- rendering hotel reviews and collapsed-on-demand video comments;
- rendering the authenticated user's review/comment activity and ownership actions;
- rendering shared hotel/person like-save controls and the private account library;
- communicating with the backend API.

Server-rendered data uses the internal `API_BASE_URL` and the value must include
the `/api/v1` base path. Browser-side requests default to same-origin `/api/v1`.
In local development a Next.js rewrite can forward that path to NestJS; in the
current production deployment Nginx routes `/api/` directly to NestJS while
normal page traffic goes to Next.js. The browser still sees one origin, so
HttpOnly session cookies stay attached to the visible site host.

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
- delivering production OTP codes through Najva's approved template endpoint;
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
- Follower Snapshot history
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

Instagram follower refresh is a separate ingestion flow and never runs inside
the public frontend:

```text
Admin bootstrap / NotablePerson IDs + handles
        ↓
Playwright persistent Instagram browser session
        ↓
Sequential public profile reads
        ↓
track_all.py scan result
        ↓
POST /api/v1/admin/catalog/followers   (only with --apply)
        ↓
CatalogService / Prisma transaction
        ├── NotablePerson.followerCount
        ├── NotablePerson.followersUpdatedAt
        └── daily FollowerSnapshot upsert
```

The default bulk scan is read-only and writes a local JSON report. `--apply`
sends only successful observations. Browser-session state and local scan output
are ignored by Git. The first complete applied run on 2026-08-16 refreshed all
149 current notable-person records after two incorrect Instagram handles were
corrected.

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
deployment concern and does not require changing page composition. These local
content binaries are excluded from Git; a development or deployment environment
must provision them separately until production object storage is introduced.

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
- reusable client-side progressive video lists for destination, hotel, and
  notable-person sections, revealing at most six cards per batch;
- filtered travel-video Explore page with creator and multi-destination context on desktop, plus a compact mobile thumbnail grid that opens a vertically snapping Reels viewer without duplicating person or destination data
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

## Current Extensions and Planned Architecture

Some data/admin extensions are now implemented while the remaining production
automation and ingestion work is still planned.

### Data Sync and Research Tooling

The data pipeline is now partially implemented as tooling outside the public
frontend.

Travel discovery/review flow:

```text
Public Instagram posts
        ↓
tools/instagram-travel-finder/graphql_client.py
        ↓
crawl_graphql.py + checkpoint/resume
        ↓
detector.py (high-recall candidate scoring, HOTEL priority)
        ↓
JSON output
        ↓
json_to_excel.py
        ↓
Human review in XLSX (approved / rejected / pending)
        ↓
import_approved.py --dry-run
        ↓
Admin API / PostgreSQL write path   (next step)
```

The approved-row importer now supports the protected Admin API write path. The
first reviewed production batch was applied successfully and created the approved
travel/hotel video data in PostgreSQL; 32 approved videos were imported in that
batch. Dry-run remains the required preflight before future applies.

The long-term normalized flow remains:

```text
Research Data / Spreadsheet
           ↓
Normalization + Review
           ↓
Validated Ingestion
           ↓
Backend API / Prisma
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

OTP delivery is provider-aware: `development` returns the generated code for
local testing, explicit `preview` temporarily exposes the code on a controlled
server without sending SMS, `disabled` keeps production API/password login available while
rejecting OTP delivery with a controlled `503`, and `najva` sends it
server-to-server through the approved `HotelYabOTPTemplate` using an API key and
sender line. `%token` is the code, `%token2` is the Tehran send time, and
`%token3` is the configured hostname used by the final `@host #code` WebOTP
line. Provider secrets never reach the browser, and disabled/Najva modes never
expose the generated code. Preview must be replaced by Najva as soon as the
provider credentials are delivered.
The challenge is stored before delivery and removed if Najva rejects or times
out, preventing a failed send from creating a false resend cooldown.

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
- immediate publication for clean comments plus simple link/repetition/risk signals;
- a five-comments-per-minute per-user limit;
- automatic hiding after three independent unresolved reports;
- role-aware user management with session revocation on block;
- staff permanent-deletion controls for hotel reviews and video
  comments/replies, exposed inside moderation with inline confirmation.

The administration layer is split by responsibility:

- `/admin/moderation` is available to `ADMIN` and `MODERATOR` for user content;
- `/admin/users` lets `ADMIN` and `MODERATOR` search/manage non-admin accounts;
- `/admin/administrators` is the separate moderator-only administrator review
  surface; self-editing, admin peer-management, and blocking the final active
  admin are prevented;
- `/admin/catalog` is available to `ADMIN` and `MODERATOR` and creates canonical destination,
  hotel, notable-person, and categorized `TRAVEL`/`HOTEL` video records directly
  in PostgreSQL; the current catalog API also updates destinations, hotels, and
  notable people and exposes protected delete routes for canonical records;
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

The first admin role is bootstrapped with the local `user:set-role` command.
After bootstrap, `/admin/users` provides the deliberately scoped account and
role-management UI described above.

---

## Architectural Boundaries

### Frontend

Responsible for:

- UI;
- rendering;
- navigation;
- frontend API calls;
- composing published hotel-linked videos into a dedicated hotel-video section
  and keeping notable guests without matching videos in a compact separate grid;
- embedding published hotel videos in their matching notable-person hotel
  association while keeping travel videos in the destination-linked section;
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

Ingestion tooling is responsible for:

```text
Raw/Public Research Data
   ↓
Normalization + Candidate Detection
   ↓
Human Review / Validation
   ↓
Admin API
   ↓
Prisma / PostgreSQL
```

The Instagram travel finder and follower tracker live under `tools/` and remain
separate from the public frontend. The follower tracker already supports
database writes through the protected Admin Catalog API. The approved-travel
XLSX importer is still dry-run-first; its write path is the next implementation
step.

---

## Production Operations

The first production deployment currently uses:

- ArvanCloud VPS, Ubuntu 24.04;
- Node.js `v24.19.0` through NVM and pnpm `11.18.0`;
- PostgreSQL 17 as the active production database major version;
- `hotel-yab-api.service` and `hotel-yab-web.service` managed by systemd;
- Nginx as the public reverse proxy;
- UFW allowing SSH, HTTP, and HTTPS while keeping application/database ports private;
- filesystem content media under the same `apps/web/public/...` paths, provisioned
  separately from Git;
- a daily custom-format PostgreSQL backup timer at 03:00 UTC under
  `/var/backups/hotel-yab`.

The site is currently reachable through the VPS IP. Domain/HTTPS, off-server
backup, monitoring, and production Najva credentials/live-delivery validation
remain follow-up work. A production auth
session-refresh issue is also still open and must be fixed before broader launch.

The intended code-update flow is development/testing on the Mac, commit/push to
Git, `git pull` on the VPS, dependency/migration/build steps as required, then
controlled systemd service restart. Direct production code editing is not the
normal workflow.

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
