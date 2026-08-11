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
of appending it to `occupation`.

**Reason:** Occupation is stable descriptive metadata, while follower count is
a time-sensitive number used for display and sorting. Keeping them separate
avoids string parsing in the API and preserves people whose count is unknown.

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

The `/explore` route resolves the same keys for every video and composes the
existing creator, player, and destination-link components. Filtering uses the
resolved title, Instagram username, destination type, and destination slug;
changing destination type clears an incompatible destination selection. The
client initially reveals six matched videos and adds six more per explicit
button press without navigation or refresh.

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
stored.

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

## 26. Proxy Browser API Requests Through the Frontend Origin

**Decision:** Browser-side authentication, review, and comment requests use
relative `/api/v1` URLs. Next.js rewrites them to the internal API URL. Server
Components continue to use `API_BASE_URL` directly.

**Reason:** A browser-side `localhost:4000` address points to the visitor's own
device when the site is opened through a LAN IP. Same-origin proxying works on
localhost and network addresses, avoids unnecessary CORS coupling, and keeps
HttpOnly session cookies attached to the visible frontend host.

**Status:** Active

## 27. Use Hybrid Moderation for Video Comments

**Decision:** A new video comment or reply is classified before insertion. A
clean comment from a user with at least two published comments is published
immediately. New users, links, exact recent repeats, and baseline risky terms go
to `PENDING`. Each user is limited to five comment submissions per 60 seconds.
Users may report someone else's published comment once; three distinct open
reports hide it automatically. Staff can resolve reports through the existing
content-status workflow, while only administrators can block/reactivate users.

**Reason:** Premoderating every comment does not scale, but fully unmoderated
publication creates avoidable abuse risk. Derived trust avoids a fragile manual
badge, simple risk signals catch common cases, reports provide community input,
and automatic hiding limits exposure until staff review.

**Status:** Active

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
JPEG/PNG/WebP up to 1 MB.

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
are missing. Only `ADMIN`, not `MODERATOR`, receives permanent-delete endpoints
and inline confirmed deletion controls for hotel reviews and video comments.

**Reason:** Registration intentionally requires only mobile, username, and
password, so requiring names at comment time contradicted the new signup flow.
The neutral author label preserves privacy without blocking participation.
Status moderation remains the normal staff workflow, while permanent deletion
is reserved for administrators because it is destructive and parent-comment
deletion cascades to replies.

**Status:** Active; implemented without a database migration.
