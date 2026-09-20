# Hotel-Yab Technical & Product Decisions

This document records important decisions made during the development of Hotel-Yab and the reasoning behind them.

The purpose is to avoid revisiting the same decisions without context and to make future changes intentional.

---

## 1. Monorepo Structure

**Decision:** Keep the frontend, backend, shared project files, and documentation in one repository.

```text
Hotel-Yab/
├── apps/
│   ├── web/
│   └── api/
├── docs/
└── PROJECT_CONTEXT.md
```

**Reason:**

- frontend and backend belong to the same product;
- easier local development;
- easier version control;
- documentation stays synchronized with the codebase.

**Status:** Active

---

## 2. Next.js for the Frontend

**Decision:** Use Next.js with React and TypeScript for the web application.

**Reason:**

- good support for public and SEO-oriented pages;
- server-side data fetching;
- file-based routing;
- suitable for hotel and notable-person detail pages;
- TypeScript support across the frontend.

**Status:** Active

---

## 3. Separate Backend API

**Decision:** The frontend must access application data through the backend API rather than directly accessing the database.

```text
Frontend
   ↓
Backend API
   ↓
Database
```

**Reason:**

- separates UI from business logic;
- allows publication and verification rules to live outside the frontend;
- makes future mobile apps, admin panels, or other clients possible;
- improves maintainability.

**Status:** Active

---

## 4. PostgreSQL as the Main Database

**Decision:** Use PostgreSQL as the primary persistent database.

**Reason:**

Hotel-Yab contains strongly related structured data such as:

```text
Hotel
 ↕
Association
 ↕
Notable Person
```

A relational database fits these relationships and provides reliable querying, constraints, and indexing as the dataset grows.

**Status:** Active

---

## 5. Prisma as the ORM

**Decision:** Use Prisma between the TypeScript backend and PostgreSQL.

```text
Backend
   ↓
Prisma
   ↓
PostgreSQL
```

**Reason:**

- typed database access;
- schema management;
- easier migrations;
- reduced mismatch between application types and database models.

Prisma must remain a backend dependency and must not be used directly by the frontend.

**Status:** Active

---

## 6. Hotel–Person Relationship as a Separate Domain Concept

**Decision:** A relationship between a hotel and a notable person should not be represented only as a field inside either entity.

It is modeled as an Association.

```text
Hotel
  ↓
Association
  ↓
Notable Person
```

**Reason:**

The relationship itself may eventually contain information such as:

- source;
- verification state;
- relationship type;
- evidence;
- publication status;
- dates or contextual information.

**Status:** Active

---

## 7. Stored Data Is Not Automatically Public Data

**Decision:** A record existing in the database does not automatically make it eligible for public display.

Conceptually:

```text
Collected Data
      ↓
Structured Data
      ↓
Verification / Publication Rules
      ↓
Public Website
```

**Reason:**

Hotel-Yab depends heavily on the credibility of relationships between hotels and notable people.

Verification and publication rules are therefore part of the product, not just data-cleaning concerns.

Detailed rules belong in `DATA_POLICY.md`.

**Status:** Active

---

## 8. Simplified Notable-Person Categories

**Decision:** Keep the primary category taxonomy relatively small.

Current high-level categories include:

- Actor
- Athlete
- Influencer
- Musician
- Public Figure

More specific information belongs in fields such as `occupation`.

Example:

```text
primaryCategory: ACTOR
occupation: بازیگر و تهیه‌کننده
```

**Reason:**

Primary categories are mainly used for navigation and filtering.

Too many categories make filtering inconsistent, while `occupation` can preserve more detailed information.

**Status:** Active

---

## 9. URL-Based Search, Filters, and Pagination

**Decision:** Listing state should be represented through URL parameters where practical.

Examples:

```text
/hotels?city=tehran&page=2

/notable-people?category=ACTOR&page=3
```

**Reason:**

- pages can be shared;
- refresh does not lose state;
- browser navigation works naturally;
- pagination and filtering remain predictable;
- better foundation for SEO.

**Status:** Active

---

## 10. Reusable UI Components

**Decision:** Repeated UI patterns should be implemented as reusable components instead of being duplicated inside pages.

Examples:

- `HotelCard`
- `PersonCard`
- `PersonProfileMeta`
- `PersonOccupation`
- `MediaTile`
- `EmptyState`

**Reason:**

This keeps presentation consistent and makes later UI changes easier.

**Status:** Active

---

## 11. Persian-First UI with Explicit LTR Handling

**Decision:** The main interface is RTL, while Latin content is handled explicitly as LTR where needed.

Examples include:

- Instagram handles;
- Latin numbers;
- URLs.

**Reason:**

Automatic bidirectional text rendering can produce incorrect layouts when Persian and Latin content are mixed.

**Status:** Active

---

## 12. Data Collection and Product Development Stay Separate

**Decision:** Research data collection should not be tightly coupled to frontend code.

Current concept:

```text
Research Data
      ↓
Structured Data
      ↓
Database
      ↓
Website
```

Future concept:

```text
Research Spreadsheet
        ↓
Clean Dataset
        ↓
Sync Script
        ↓
PostgreSQL
        ↓
Website
```

**Reason:**

The dataset is expected to grow significantly, so manual modifications inside application code are not a scalable long-term solution.

**Status:** Transition planned

---

## 13. Build the Sync Pipeline Before Large-Scale Data Growth

**Decision:** Introduce a structured synchronization pipeline before the research dataset becomes very large.

**Reason:**

Migrating hundreds or thousands of manually maintained records later would create unnecessary cleanup and migration work.

The planned pipeline will be documented separately when implementation begins.

**Status:** Planned

---

## 14. Accounts Must Not Block Public Discovery

**Decision:** Hotel-Yab now supports optional accounts, but no public discovery
page requires login. Authentication is introduced only where identity is needed
for reviews, comments, and personal account data.

Current account capabilities include verified registration, password/OTP login,
profile data, hotel reviews, video comments, contribution moderation, and a
consolidated view of the current user's activity.
Potential later features include:

- favorites;
- saved hotels;
- personalization;

**Reason:**

Keeping read access open preserves the discovery-first product while an account
adds value only when a user chooses to contribute.

**Status:** Active

---

## 15. Admin and Moderation Grow by Concrete Workflow

**Decision:** Build only the administration surface needed by a real workflow.
The first implemented slice is a protected queue for hotel reviews and video
comments, with publish/reject/hide/pending actions and latest-decision audit
fields.

Future slices may support:

- editing hotels;
- editing notable people;
- reviewing associations;
- verifying sources;
- controlling publication status.

**Reason:**

The exact moderation workflow should be based on the real data-management process rather than assumptions made too early.

**Status:** Active; contribution moderation is implemented, catalog moderation is planned

---

## 16. Documentation Is Split by Responsibility

**Decision:** Project knowledge should not remain only inside `PROJECT_CONTEXT.md`.

Documentation responsibilities are:

```text
ARCHITECTURE.md → how the system is structured
DECISIONS.md    → why important decisions were made
API.md          → API contracts
DATABASE.md     → database structure
DATA_POLICY.md  → data and verification rules
CHANGELOG.md    → what changed
TODO.md         → what remains to be done
```

`PROJECT_CONTEXT.md` remains the high-level context and navigation document.

**Status:** Active

## 17. Destination-Based Discovery

Hotel-Yab uses a unified destination concept for geographic discovery.

The MVP currently supports two destination types:

- City
- Province

Destination data was initially stored in frontend JSON and is now canonical in
the `Destination` Prisma model.

Public destination routes use:

- `/destinations`
- `/destinations/[type]/[slug]`

The type segment prevents ambiguity when a city and province share the same slug,
such as Tehran.

Travel videos may be associated with one or more cities or provinces through
`VideoDestination`; persistence moved to Prisma after the workbook structure
was validated.

Related hotels are resolved without adding hotel copies to destination data.
For a city, the frontend requests published hotels whose `city` exactly matches
the destination name. For a province, it collects the city records with the
same `parentProvinceSlug`, queries those city names, and deduplicates the
combined hotel result by canonical hotel ID.

**Reason:** This reuses the current hotel API and `HotelCard`, keeps hotel data
canonical, and gives province pages useful results without duplicating hotels
inside destination records.

**Status:** Active; persistence details superseded by Decision 34.

## 18. Separate Follower Count from Occupation

**Decision:** Store `followerCount` as an optional non-negative integer instead
of appending it to `occupation`. The latest successful count remains on
`NotablePerson`; capture time is stored in `followersUpdatedAt`, while daily
history is stored separately in `FollowerSnapshot`.

**Reason:** Occupation is stable descriptive metadata, while follower count is
a time-sensitive number used for display and sorting. Keeping the latest value
on the person avoids expensive history joins on normal listing pages, while a
separate daily history preserves change over time without string parsing or
overwriting historical observations.

**Status:** Active

## 19. Sort Public Listings in the Backend

**Decision:** Apply hotel and notable-person sorting in the API before
pagination. Hotel sorts are name and city; person sorts are follower count,
name, and hotel-association count.

**Reason:** Sorting only the current frontend page would produce incorrect and
unstable results across pagination. URL query parameters keep the selected sort
shareable and reproducible.

Hotel media keeps the optional logo in `logoUrl`, separate from the main
`imageUrl`, so both can be displayed without replacing one another.

**Status:** Active

## 20. Resolve Travel Videos by Stable Relationship Keys

**Decision:** Keep the current prototype relationship normalized as:

```text
Person.instagramHandle ← TravelVideo.instagramUsername
TravelVideo.videoId ← VideoDestinations.videoId → Destination type + slug
```

Person metadata is resolved through the existing notable-person API using an
exact normalized Instagram handle. Destination metadata is resolved from the
canonical `Destination` relation. Video rows do not duplicate person or
destination names, images, follower counts, or descriptions.

The `/explore` route resolves the same keys for every content aggregate and
composes the shared cover grid and full-screen viewer. Filtering uses the
resolved title, Instagram username, destination type, and destination slug;
changing destination type clears an incompatible destination selection. The
client reveals 12 desktop or 9 mobile covers per batch without navigation or
refresh. Hotel detail pages reuse this exact grid/viewer and resolve creator
profiles from `instagramUsername`; destination and notable-person sections keep
their compact six-at-a-time progressive presentation.

**Reason:** A person's profile data can change independently, and one video may
belong to several destinations. Relationship keys prevent stale copies and
keep `sourceUrl` attached to the original Instagram post.

**Status:** Active

## 21. Use Password or Mobile OTP with Opaque Server-Side Sessions

**Decision:** Registration is separate from login and requires mobile OTP
verification, a unique username, and a strong password. The website collects
only an `09…` mobile, username, and password during signup; name, family name,
email, Instagram, and avatar are completed later. A new password must have 8–72
characters with lowercase/uppercase Latin letters, a digit, and a symbol.
Default login accepts mobile or username plus password; OTP remains a
passwordless/fallback login for an existing account. OTP resend uses the
server-provided cooldown, 60 seconds by default. Successful authentication sets
an HttpOnly, SameSite=Lax cookie. The raw password, session token, and OTP are
never persisted; only salted `scrypt`, SHA-256, and HMAC hashes respectively are
stored. Every session has an absolute 24-hour lifetime from creation; the API
applies that ceiling to older sessions that were originally issued with a longer
expiry as well.

**Reason:** Explicit registration makes the account lifecycle understandable,
password login avoids an SMS dependency on every visit, and OTP preserves
mobile ownership verification and account access when the password is not used.
Server-side sessions remain revocable. Deferring optional profile fields lowers
signup friction without removing them. Strong new-password validation improves
account safety while password verification stays backward-compatible. Email
remains optional profile metadata.
Development may expose its OTP for local testing, but production requires an
SMS provider.

**Status:** Active

## 22. Do Not Self-Report Notable-Person Status or Follower Count

**Decision:** A user may optionally enter an Instagram handle, but cannot set a
follower count or link the account to `NotablePerson`. That link is unique and
must be verified administratively.

**Reason:** Follower count is volatile and untrusted when self-reported, while a
false public-person identity would damage the product's trust model.

**Status:** Active

## 23. Keep Hotel Reviews Premoderated

**Decision:** Hotel reviews start as `PENDING`; public API responses include only
`PUBLISHED` reviews. Editing a hotel review returns it to `PENDING`. One review
is allowed per user/hotel. Video comments follow the separate hybrid policy in
Decision 27.

**Reason:** User-generated content must not bypass the same trust boundary used
elsewhere in Hotel-Yab.

**Status:** Active; protected review moderation UI is implemented

## 24. Attach Comments to the Canonical Video and Keep Them Collapsed

**Decision:** Comments belong to a canonical `Video` record rather than a
destination/person page. The frontend hides the comment panel by default and
loads it only when the user opens it.

**Reason:** One video can appear under several destinations and a person. A
single comment thread prevents duplication, while collapsed UI keeps video
discovery visually focused.

**Status:** Active

## 25. Keep Official Hotel Stars Separate from User Ratings

**Decision:** Store the reviewed official hotel classification in nullable
`Hotel.starRating` as an integer from 1 to 5. Calculate `ratingSummary` only
from published user reviews. Present both as separate UI elements and do not
place a star icon beside the user-review score.

**Reason:** A hotel's official classification is an external property of the
hotel, while a user score is a changing aggregate of Hotel-Yab reviews. Mixing
them would misrepresent both values.

**Status:** Active

## 26. Keep Browser API Requests on the Visible Site Origin

**Decision:** Browser-side authentication, account, review, comment, and admin
requests use relative `/api/v1` URLs. Server Components use `API_BASE_URL`
directly. Local development may use the Next.js rewrite; the current production
Nginx config routes `/api/` directly to NestJS and sends normal page traffic to
Next.js.

**Reason:** A browser-side `localhost:4000` address points to the visitor's own
device. Keeping `/api/v1` same-origin works in development and production and
keeps HttpOnly session cookies on the visible host while allowing the reverse
proxy implementation to differ by environment.

**Status:** Active

## 27. Use Hybrid Moderation for Video Comments

**Decision:** A new video comment or reply is classified before insertion. A
clean normal-user comment is published immediately. Links, exact recent repeats,
and baseline risky terms go to `PENDING`; staff comments bypass premoderation.
Each user is limited to five comment submissions per 60 seconds.
Users may report someone else's published comment once; three distinct open
reports hide it automatically. Staff can resolve reports through the existing
content-status workflow; account-management permissions follow Decision 44.

**Reason:** Premoderating every comment does not scale, but fully unmoderated
publication creates avoidable abuse risk. Simple risk signals catch common
cases, reports provide community input, and automatic hiding limits exposure
until staff review.

**Status:** Superseded and simplified by Decision 44.

## 28. Federate Global Search Across Current Canonical Sources

**Decision:** `/search` queries the existing hotel and notable-person APIs in
parallel and searches the current destination prototype locally. Results are
grouped by entity type and link to the canonical detail or complete listing
route. The homepage search form targets this route instead of the hotel-only
listing.

**Reason:** Hotels and people already have correct publication-aware API search,
while destinations have not moved into PostgreSQL yet. A frontend federation
delivers useful global search without duplicating entities or introducing a
temporary backend index that would immediately need replacement. Independent
group errors preserve partial results when one source is unavailable.

**Status:** Active; reconsider a backend search index after destinations enter
the main data pipeline or result volume requires ranked cross-entity search.

## 29. Show Owners All Their Activity Without Exposing Moderation Notes

**Decision:** The separate `/account/activity` page aggregates the authenticated
user's hotel reviews and video comments across every moderation state, while
`/account` remains focused on profile editing. The activity page reuses the
canonical hotel review deletion endpoint and permits deleting an owned video
comment only when that comment has no replies. Internal moderation notes are
excluded.

**Reason:** Contributors need one place to understand whether their content is
pending, published, rejected, or hidden. Protecting reply-bearing parent comments
avoids deleting another user's contribution or breaking conversation structure,
while keeping staff notes private preserves the moderation boundary.

**Status:** Active; implemented without a database migration.

## 35. Keep Travel and Hotel Videos Explicitly Categorized

**Decision:** Every canonical `Video` has a `videoCategory` of `TRAVEL` or
`HOTEL`. Media remains organized in separate `/travel-videos/<person-slug>/`
and `/hotel-videos/<person-slug>/` roots, but product filtering must use the
database category rather than infer semantics from a file path. The admin form
generates an editable path suggestion. Linking a published, non-rejected hotel
video creates a missing person–hotel association as pending, never verified.

**Reason:** Hotel videos and destination travel videos can have different
discovery rules. Explicit categorization preserves that boundary even if a
video has several destination/hotel relations, while stable slug-based paths
keep local media manageable. Pending automatic associations make linked media
visible without manufacturing a verified claim.

**Status:** Active; migration `20260815120000_add_video_category`.

## 34. Make PostgreSQL the Runtime Source for Destinations and Travel Videos

**Decision:** Canonical destination metadata, complete travel-video metadata,
and video–destination/video–hotel links live in Prisma/PostgreSQL. Existing
frontend `public` media paths stay unchanged during this phase. Administrators
create records through `/admin/catalog`; transition JSON remains an idempotent
import input, and the catalog provides a validated JSON export.

**Reason:** A deployed admin page cannot safely edit repository files, and
dual-writing JSON plus PostgreSQL would create conflicting sources of truth.
Separating binary-media migration from metadata migration preserves current
local paths until production object storage is introduced.

**Status:** Active; migration `20260811220000_add_catalog_management`.

## 33. Keep Destination Workbook Input Minimal and Derive Repeated Fields

**Decision:** The private destination/video workbook remains the working input,
but destination image paths are derived from destination type and slug rather
than stored in cells. City and province `displayOrder` values use separate
numbering scopes. Workbook province names used as relationship keys are
normalized to canonical slugs before JSON generation, and each video ID is also
registered in the backend canonical `Video` dataset for comments.

**Reason:** Repeating predictable paths and stable enum values makes manual data
entry slower and creates avoidable drift. Type-scoped ordering permits a city
and a province to share the same position, while canonical slug normalization
keeps routes and video relationships resolvable.

**Status:** Active; the next improvement is a reusable workbook-to-JSON
converter with validation and dry-run output.

## 30. Keep Avatars Separate and Registration Identity-Minimal

**Decision:** Registration requires only verified mobile, unique username, and
a strong password. Name and family name are optional profile fields completed
from `/account`. Avatar bytes live in a one-to-one `UserAvatar` relation instead
of the main `User` row; the authenticated upload accepts signature-validated
common image inputs up to 15 MB, then normalizes them to a bounded WebP image.

**Reason:** A three-field signup reduces friction without weakening account
ownership or uniqueness. A separate avatar relation avoids loading binary data
during normal authentication queries and leaves a clean boundary for replacing
database-backed MVP storage with object storage later.

**Status:** Active; migration `20260811190000_add_user_avatar`.

## 31. Keep Likes and Saves Separate with Explicit Relations

**Decision:** Hotels and notable people each support two independent private
states: like and save. Four explicit user-entity join tables use composite
primary keys, and authenticated idempotent `PUT`/`DELETE` endpoints change one
state at a time. The frontend loads the current user's complete library through
one shared provider instead of querying the API from every card.

**Reason:** A like expresses preference while a save expresses intent to revisit;
combining them would make future analytics and personalization ambiguous. Explicit
relations keep referential integrity and duplicate prevention in PostgreSQL, and
the shared provider avoids N-per-card network requests across listing pages.

**Status:** Active; migration `20260811203000_add_user_likes_and_saves`.

## 32. Do Not Make Profile Names a Commenting Gate

**Decision:** Any authenticated active account may comment without completing
first and last name. Public serialization uses `کاربر هتل‌یاب` when both names
are missing. `ADMIN` and `MODERATOR` receive inline-confirmed permanent-delete
controls for hotel reviews and video comments in the moderation queue.

**Reason:** Registration intentionally requires only mobile, username, and
password, so requiring names at comment time contradicted the new signup flow.
The neutral author label preserves privacy without blocking participation.
Status moderation remains the normal workflow. Permanent deletion is explicit,
requires a second confirmation, and warns staff because parent-comment deletion
cascades to replies.

**Status:** Active; implemented without a database migration.

## 36. Collect Public Follower Counts Through a Browser Session and Write Through the Admin API

**Decision:** Use a dedicated persistent Playwright browser profile to read the
publicly visible Instagram follower count sequentially. The bulk tool reads
canonical people from `GET /admin/catalog/bootstrap`. Scans are read-only by
default; `--apply` sends only successful observations to
`POST /admin/catalog/followers`, which updates the latest person value and
upserts the daily snapshot through Prisma.

**Reason:** Replaying Instagram's private GraphQL request directly required
volatile session-bound fields and proved brittle even when a copied browser
cURL succeeded. Letting the browser construct the request preserves the same
public page behavior without hard-coding short-lived request tokens. Keeping
writes behind the Hotel-Yab API preserves the Frontend/API/Prisma/PostgreSQL
boundary. Failed reads must not erase the previous count.

Operational browser profiles, cookies, scan output, and captured request dumps
remain local and ignored by Git. The collector processes profiles sequentially
and does not implement rate-limit evasion.

**Status:** Active; first full applied scan refreshed 149 current people on
2026-08-16 after two incorrect Instagram handles were corrected.

## 37. Require Human Approval Between Instagram Travel Discovery and Database Writes

**Decision:** Keep Instagram travel discovery as a multi-stage research
pipeline:

```text
GraphQL crawl
    ↓
high-recall candidate detection
    ↓
JSON/checkpoint
    ↓
XLSX review
    ↓
approved-row validation
    ↓
Admin API / PostgreSQL
```

HOTEL-tagged candidates receive priority, but detector score/priority is not a
publication decision. Only explicit `approved` rows may progress to import.
Unresolved named destinations or hotels block a row; missing destinations are
not silently created. A blank hotel remains valid travel content. The original
Instagram `sourceUrl` is retained as the canonical source identity.

**Reason:** Automated collection should optimize recall, while publication
requires deliberate structured review. Separating detection from approved
ingestion prevents false-positive crawler output from becoming canonical data
and keeps routine writes behind the existing Admin Catalog boundary.

**Status:** Active end-to-end for crawl/review/dry-run/apply. The first reviewed
production batch successfully imported 32 approved travel/hotel videos through
the protected Admin Catalog API.

## 38. Run the First Production Version as a Single-VPS Modular Monolith

**Decision:** Run Nginx, Next.js, NestJS, Prisma/PostgreSQL, and the current
filesystem media on one Ubuntu VPS for the first production phase. Manage Web
and API with enabled systemd services.

**Reason:** The current traffic and team size do not justify Docker orchestration,
Kubernetes, microservices, or multiple application hosts. A single VPS keeps the
operational surface understandable while preserving the existing application
boundaries.

**Status:** Active for the current production phase.

## 39. Use PostgreSQL 17 as the Production Database Major Version

**Decision:** Production uses PostgreSQL 17 on port 5432. Prisma migrations are
applied before restoring/importing canonical application data.

**Reason:** The local canonical dump was produced by PostgreSQL 17 tooling and
was not safely restorable into the initially installed PostgreSQL 16 server.
Production was still empty, so aligning the server major version was simpler and
safer than rewriting the dump.

**Status:** Active. The old PostgreSQL 16 cluster remains stopped for now and may
be removed after the production environment has remained stable.

## 40. Keep Production Content Media Outside Git and Provision It Separately

**Decision:** For the current production phase, hotel/person images and
travel/hotel video binaries remain under `apps/web/public/...` on the VPS but are
not tracked by Git. Deployments provision/synchronize those directories
separately. PostgreSQL stores stable relative media paths.

**Reason:** The existing application already depends on these paths, the media
set is much larger than appropriate Git content, and introducing object storage
was intentionally separated from the first server launch.

**Status:** Active interim decision; object storage/CDN remains future work.

## 41. Back Up PostgreSQL Daily on the VPS and Add Off-Server Backup Later

**Decision:** Run a daily custom-format `pg_dump` through systemd timer at 03:00
UTC, keep a short rolling local retention window, and treat an off-server copy as
separate follow-up work.

**Reason:** A tested automatic database backup is required immediately, while
external backup storage can be added after the deployment workflow is stable.
An on-box backup does not protect against complete VPS loss, so it is not the
final disaster-recovery design.

**Status:** Active for local VPS backups; off-server backup is pending.

## 42. Develop Locally and Deploy Through Git Instead of Editing Production Code

**Decision:** Normal development happens on the Mac, is tested locally, committed
and pushed, then pulled and built on production. Production code is not edited
directly except for an explicit emergency.

**Reason:** This keeps the server reproducible, preserves reviewable history, and
reduces drift between the laptop and the deployed application.

**Status:** Active operational workflow.

## 43. Separate Hotel Videos from Notable-Guest Associations

**Decision:** Hotel Detail renders published `VideoHotel` content first in the
same creator-plus-video composition used by destination pages. Associations
whose people have no matching hotel video render afterward as a compact guest
grid. Notable-person detail resolves both `TRAVEL` and `HOTEL` videos directly
from PostgreSQL by normalized Instagram handle, embeds hotel videos in their
matching hotel association, and keeps travel videos in the destination section.

**Reason:** A hotel-introduction video is primary visual content, while a known
person merely visiting the hotel is a different claim. Mixing both into one
large association card made the page harder to scan and hid useful videos.

**Status:** Active.

## 44. Publish Clean Comments Immediately and Scope Staff User Management

**Decision:** Clean normal-user video comments publish immediately without a
two-approved-comment threshold; link, repetition, and risky-term signals still
queue a comment. `ADMIN` and `MODERATOR` reviews/comments bypass premoderation.
`ADMIN` and `MODERATOR` manage non-admin accounts, while `MODERATOR` receives a
separate administrator-review page and can access catalog management. Staff
cannot manage themselves, admins cannot manage admin peers, and the last active
admin cannot be blocked.

**Reason:** The old threshold created unnecessary queue volume. Risk signals and
reports still cover common abuse, while explicit role scoping prevents ordinary
admin peer lockout and preserves the requested moderator oversight path.

**Status:** Active.

## 45. Deliver Production OTP Through a Najva Approved Template

**Decision:** Keep OTP generation, HMAC storage, expiry, attempt limits, and
verification inside Hotel-Yab. Use Najva only as the delivery channel through
`GET https://sms.najva.com/v1/{API-KEY}/verify/lookup.json`, using the approved
`HotelYabOTPTemplate` and a configured sender line. The template maps the code
to `%token`, Tehran send time to `%token2`, and the site's WebOTP hostname to
`%token3`. Local development uses an explicit `development` provider and may
return `developmentCode`; Najva mode never returns the raw code, and production
environment validation permits an explicit temporary `preview`, `disabled` or
`najva`, but never `development`. Preview performs no external delivery and
returns the generated code only for controlled pre-credential server testing.
Disabled mode is a temporary safe state that keeps the rest of the API and
password login online while rejecting OTP with `503` and exposing no code. The
API uses a bounded request timeout without automatic retries and removes a newly
created challenge when delivery fails.

**Reason:** The existing authentication model already owns the OTP lifecycle,
so delegating only delivery avoids duplicating verification state. Explicit
provider selection prevents accidental code exposure, while removing a failed
challenge avoids trapping the user behind a cooldown for a message that was not
accepted by the provider. Avoiding automatic retries reduces duplicate SMS
risk.

**Status:** Active in production with `SMS_PROVIDER=najva`, the approved
template, sender, WebOTP hostname, and whitelisted VPS IP. Najva accepted the
first real production request successfully and its delivery to the handset was
confirmed. Resend/failure regression remains an operational follow-up. Preview
is no longer the active production provider.

## 46. Keep Core Interaction Feedback Inside the Site UI

**Decision:** Use a shared local SVG icon set and site-owned responsive dialogs
for destructive confirmations. Mobile navigation and account controls use two
mutually exclusive full-height drawers. Search fields may submit automatically
after two characters and normalize common Persian/Arabic letter variants, while
canonical stored values remain unchanged.

**Reason:** Browser-native confirmation UI is inconsistent on mobile Safari,
emoji glyphs vary by platform, and exact Persian Unicode matching makes ordinary
search input unnecessarily fragile. Shared components keep behavior, visual
language, keyboard handling, and responsive layout consistent without adding a
third-party UI or icon dependency.

**Status:** Active.

## 47. Model Posts and Stories as Ordered Media Under the Canonical Video Aggregate

**Decision:** Keep the existing `Video` record and stable ID as the canonical
content aggregate because comments, destination links, hotel links, and public
routes already depend on it. Add an independent `contentKind` (`VIDEO`, `POST`,
or `STORY`) and ordered `VideoMediaItem` children. A single video has exactly
one video child; a post or story/highlight has one or more children and may mix
image and video media. Retain the old top-level media fields as a mirror of the
first child during the transition. All public surfaces use one Highlight-style
viewer; horizontal navigation stays inside the current aggregate and vertical
navigation moves to the next aggregate.

**Reason:** Treating every slide as a separate video would duplicate captions,
comments, creators, destinations, hotels, and original Instagram links. Reusing
the aggregate preserves current data and relationships while supporting
multi-item Instagram formats without guessing behavior from file extensions or
the legacy free-text `contentType` tag.

**Status:** Active; migration `20260829120000_add_content_media_items` backfills
every existing media-bearing video as a one-item `VIDEO`.

## 48. Allow Multiple Content Records to Share an Original Source URL

**Decision:** Keep `Video.id` as the unique canonical content identity, but do
not enforce uniqueness on `Video.sourceUrl`. Separate records may intentionally
refer to the same Instagram post/reel when the catalog needs distinct content
entries. Relations, media items, and comments continue to reference the stable
video ID. The reviewed-workbook importer retains its conservative source-based
idempotency guard so rerunning one workbook does not create accidental copies;
intentional source reuse is authored through catalog management.

**Reason:** An original post URL is provenance, not necessarily content
identity. Treating it as a database key prevented valid deliberate records,
while removing uniqueness does not weaken relational integrity because no
relation depends on that URL.

**Status:** Active through migration
`20260905120000_allow_shared_video_source_urls`.

## 49. Store Crawler Review State in PostgreSQL and Run Media Work as a Controlled Job

**Decision:** Replace mandatory JSON-to-XLSX review with a protected
`/admin/crawl-reviews` queue. Upload raw crawler JSON, persist each candidate and
its explicit review decision in `CrawlReviewBatch`/`CrawlReviewItem`, and export
a machine-readable reviewed JSON file that the existing approved-media tools can
consume. Keep XLSX accepted as a legacy/offline review format.

Keep manual reviewed-JSON export available, but use a loopback-only helper on
the Moderator's laptop as the primary crawl/download runner. It reads the
already-authenticated local browser session, checkpoints crawl progress, and
never sends cookies to Hotel-Yab. The API issues a short-lived HMAC ticket scoped
to one reviewed batch; the helper runs one job at a time and may fetch that
batch/catalog, upload validated final media, create only approved batch content,
and report completion/failure. Downloader → preparation → dry-run → apply stays
in the existing Python tooling. The older server-side job remains a fallback,
not the active production route.

**Reason:** Review benefits from canonical hotel/destination selectors, shared
progress, and durable status. The VPS cannot reach Instagram, while the
operator's browser already has a valid session. Keeping that session local
avoids proxy credentials and account-cookie transfer, and reusing the tested
Python tools avoids maintaining a second importer. Manual processing remains
the recovery path.

**Status:** Implemented with migrations
`20260913120000_add_crawl_review_queue` and
`20260913123000_link_crawl_review_creator` and
`20260913140000_add_crawl_review_processing`; the loopback helper and restricted
batch-ticket API require no additional database migration.

## 50. Poll GitHub from Production and Deploy New Main Revisions

**Decision:** A systemd timer on production checks `origin/main` once per minute.
When the remote revision differs, a locked repository script invokes the safe
production deployment script. The deploy refuses tracked production changes and
uses a fast-forward-only update before installing dependencies, applying
migrations, building, restarting services, and checking health.

**Reason:** One reviewed deployment path prevents the laptop and VPS commands
from drifting. Server-side polling reuses the VPS's existing read-only GitHub
access and avoids placing a server-login private key in GitHub. The same deploy
script remains reusable manually, while media and secrets stay outside Git.

**Status:** Active in production through `hotel-yab-deploy.service` and
`hotel-yab-deploy.timer`; the timer is enabled and its first GitHub check was
verified successfully.

## 51. Package the Local Crawler as a Desktop Helper

**Decision:** Distribute the operator-side crawler/downloader/importer as a
self-contained `HotelYab-Crawler` desktop application. The admin page provides
platform-specific downloads and communicates with the helper through the same
restricted loopback protocol. Keep the Python command as a development and
recovery path.

The bundle stores checkpoints and prepared media in the user's application-data
directory. It embeds the location catalog and Python tooling, targets production
by default, binds only to `127.0.0.1:4317`, accepts only Hotel-Yab/local origins,
and never uploads browser cookies. Generated application archives remain outside
Git and the public web tree. They are streamed from private production storage
only after session authentication and an `ADMIN`/`MODERATOR` role check.

**Reason:** Moderators should be able to install one application and use buttons
in the web panel without cloning the repository, installing Python packages, or
running terminal commands. Native builds also let browser-cookie access happen
on the operator's own logged-in computer.

**Status:** Implemented with native CI builds for macOS Apple Silicon, macOS
Intel, and Windows. Apple Developer notarization/code signing remains an
optional distribution improvement; the current macOS bundle uses an ad-hoc
signature and may require right-click → Open on first launch.

Native CI artifacts are retained in GitHub Actions and copied manually to the
private production download directory. Direct CI publication was rejected
because GitHub-hosted runners cannot reach the datacenter SSH port; keeping that
step would make otherwise valid builds fail. Deployment migrates any legacy
public archive before building the website.
