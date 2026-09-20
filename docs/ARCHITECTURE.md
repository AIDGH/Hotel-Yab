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
│   │   ├── download_highlights.py # Direct ordered Highlight media downloader
│   │   ├── import_highlight.py # Validated Highlight manifest to Admin API importer
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
/admin/crawl-reviews
```

Frontend data access is handled through functions such as:

```text
getHotels(...)
getNotablePeople(...)
```

Database logic must not be implemented inside frontend components.

### Brand and application icons

`apps/web/public/brand/hotelyab.svg` is the canonical vector brand asset: a
destination marker with a play-shaped cutout on the site's purple background.
The shared `BrandMark` renders it in both the header and footer. Brand assets
are tracked UI assets, not user/catalog media.

`pnpm web:icons` runs `scripts/generate-brand-icons.mjs` using Next.js's installed
Sharp dependency. It generates a multi-size ICO (16/32/48/64/256), PNG icons
(96/192/512), an opaque 180px Apple Touch Icon, a full-bleed 512px maskable icon,
and a 1024px export for future native-app packaging. Mobile variants avoid
transparent corners and keep the mark within the maskable safe circle.

The root metadata declares the favicon and Apple icon; Next.js serves the
`manifest.ts` file at `/manifest.webmanifest` and adds its link automatically.
The manifest provides Persian/RTL app naming and a standalone home-screen
launch configuration. It does not add offline support or a native application.
Icon URLs stay stable and publicly crawlable; Google Search appearance depends
on Google's recrawl and is not guaranteed immediately after deployment.

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

`Video` stores the canonical content identity, `TRAVEL`/`HOTEL` relationship
category, independent `VIDEO`/`POST`/`STORY` format, normalized metadata,
`sourceUrl`, and publication/verification state. Ordered `VideoMediaItem` rows
store the actual images or videos. Person metadata comes from the existing
notable-person API, while destination labels and links come from `Destination`.
One content aggregate may resolve to multiple destinations. City/province
display-order values remain scoped independently.

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

`/explore` reads the same normalized content relationships. Its cover grid opens
a unified full-screen viewer: horizontal navigation changes ordered media within
the current post/story through edge-aligned desktop keyboard/click controls or a
mobile drag track that follows the pointer and exposes the adjacent item while
moving; mobile arrows are intentionally omitted. Each active segment reflects
video playback progress or a five-second image interval and advances to the next
media item. Holding the center pauses playback/timing and hides overlays, while
holding either video edge temporarily uses 2× playback. Vertical snap scrolling
changes the canonical content aggregate. The same multi-item renderer is reused on destination,
hotel, and notable-person detail pages. Search and destination filters operate
on resolved relationships; person and destination metadata are not copied into
content data.

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
- reusable client-side progressive content lists for destination and
  notable-person sections, revealing at most six cards per batch;
- filtered travel-content Explore page with creator and multi-destination
  context, a four-column desktop cover grid and a compact three-column mobile
  grid that open the shared vertically snapping full-screen viewer without
  duplicating person or destination data;
- hotel-detail content rendered through the same Explore grid/viewer, resolving
  creator profiles by normalized Instagram username and revealing 12 desktop or
  9 mobile covers per batch;
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
Public Instagram posts + authenticated browser session on the operator laptop
        ↓
local_crawl_worker.py (primary) or graphql_client.py (manual fallback)
        ↓
crawl/checkpoint/resume + detector.py
        ↓
detector.py (high-recall candidate scoring, HOTEL priority)
        ↓
JSON output
        ↓
automatic local result upload to Admin `/admin/crawl-reviews`
        ↓
Human review with canonical city/province selectors and optional hotel
        ↓
Reviewed JSON export (legacy XLSX remains supported)
        ↓
download_approved.py (approved media only; ordered IMAGE/VIDEO manifest)
        ↓
import_approved.py --prepare-media
        ↓
import_approved.py --dry-run
        ↓
batch-scoped local-worker API / PostgreSQL write path
```

The review queue persists batches and individual review rows, but keeps raw
crawler payloads internal. An approved row requires a final title and at least
one province. The exported JSON deliberately exposes the same Persian logical
headers consumed by the legacy workbook importer, so `download_approved.py` and
`import_approved.py` accept either a reviewed JSON export or an XLSX workbook.

The approved-media downloader reads rows by Persian header name, downloads only
`approved` shortcodes, refreshes missing/expired Instagram media metadata through
an optional Instaloader session, and writes one ordered local manifest per content
aggregate. The media-preparation phase maps blank-hotel rows to `travel-videos`
and resolved-hotel rows to `hotel-videos`, converts images/covers to WebP, and
keeps mixed POST/STORY items under one canonical content ID. The protected Admin
API apply path remains the final write step; dry-run remains required before it.
When Instagram CDN URLs expire, the downloader can import the already-authenticated
browser session with `--load-cookies chrome`, refresh shortcode metadata, and save
an Instaloader session for later `--login <username>` runs without terminal password
entry. Per-post download/metadata failures are accumulated in a local failure
report while the remaining approved rows continue; final media preparation is
blocked until every still-approved row has a complete manifest.

Instagram fetching and public-media preparation remain local operations rather
than API jobs: they rely on a user's authenticated browser session and write
large ignored files below `apps/web/public`. The server-side admin queue handles
review state and canonical selections, while the protected Catalog API remains
the only database write boundary for final content.

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
  hotel, notable-person, and categorized `TRAVEL`/`HOTEL` content records directly
  in PostgreSQL; the catalog API also updates all four entity groups and exposes
  protected delete routes for canonical records. Content edits retain the
  canonical video ID while replacing metadata, ordered media, and selected
  destination/hotel joins inside one transaction;
- the catalog content form selects `VIDEO`, `POST`, or `STORY`; each post or
  story item independently selects `IMAGE` or `VIDEO` and can be reordered,
  and the form provides searchable click-to-toggle multi-selection,
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
- `/admin/crawl-reviews` is available to `ADMIN` and `MODERATOR`; it accepts a
  selected catalog person's Instagram handle or a fallback crawler JSON file,
  accepts mixed-account JSON and atomically groups its rows into independent
  per-account review batches after normalizing handles. Each row keeps its own
  creator, deduplication uses account plus shortcode, and missing owners in mixed
  files are rejected rather than guessed. The queue resolves detected catalog
  hints, supports explicit approved/rejected decisions, exports a reviewed JSON
  file for the local media tools, and records when the batch has been processed.
  The primary crawler is a loopback-only helper bound to `127.0.0.1`: it reads
  the operator's authenticated browser session locally, checkpoints interrupted
  crawls, and uploads candidate JSON without exporting Instagram cookies.
  A `MODERATOR` can additionally start downloader → preparation → dry-run →
  apply through that helper. The API issues a short-lived HMAC-signed ticket
  scoped to one reviewed batch; the helper may fetch that batch/catalog, upload
  only final MP4/WebP paths in chunks below the reverse-proxy request limit,
  create only approved batch content, and report
  completion/failure. Only one local job runs at a time.

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

The site is reachable through its HTTPS domain. Najva production credentials,
sender, WebOTP hostname, and VPS IP whitelist are active, and the provider has
accepted a real OTP request whose handset delivery was confirmed. Provider
failure/resend regression, off-server backup, and monitoring are follow-up work. A production auth
session-refresh issue is also still open and must be fixed before broader launch.

The old API-process crawler job remains disabled because the current datacenter
cannot reach Instagram. Production review/download now uses the operator-side
standalone `HotelYab-Crawler` desktop helper. The same source remains runnable as
`local_crawl_worker.py --environment production` for development and recovery.
Its HTTP server is loopback
only, accepts only the known local and Hotel-Yab origins, and has fixed local or
`hotelyab.jaryan.net` API targets. Browser cookies and Instaloader sessions stay
on the operator machine; only candidate metadata and approved final media are
sent to Hotel-Yab. API restarts still mark stale `RUNNING` batches retryable.

`scripts/build-crawl-helper.py` uses PyInstaller one-folder bundles so moderators
do not need the repository, Python, or a terminal. The packaged entry point is
`desktop_worker.py`; it embeds the crawler/downloader/importer scripts and their
runtime dependencies, stores checkpoint/media work under the current user's
application-data directory, and opens only `127.0.0.1:4317`. macOS Apple Silicon
is built and smoke-tested locally; `.github/workflows/build-crawl-helper.yml`
builds macOS Intel and Windows artifacts on their native runners. Published ZIPs
are copied to the Git-ignored `apps/web/public/downloads/` directory on
production and linked from `/admin/crawl-reviews`.

The intended code-update flow is development/testing on the Mac followed by a
push to `main`. The production `hotel-yab-deploy.timer` checks `origin/main`
once per minute and runs `scripts/check-and-deploy-production.sh` only when a
new revision exists. The locked checker delegates to the checked-in
`scripts/deploy-production.sh`, which performs a fast-forward-only pull,
dependency install, Prisma generation/migration, both production builds,
controlled systemd restarts, and retrying local health checks. This avoids
storing a VPS login key in GitHub. Media remains outside Git and still requires
explicit synchronization. Direct production code editing is not the normal
workflow.

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
