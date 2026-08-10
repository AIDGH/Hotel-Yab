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
profile data, hotel reviews, video comments, and contribution moderation.
Potential later features include:

- favorites;
- saved hotels;
- personalization;
- consolidated contribution management.

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

Destination data is temporarily stored in `apps/web/src/data/destinations.json`,
separated into `cities` and `provinces`.

Public destination routes use:

- `/destinations`
- `/destinations/[type]/[slug]`

The type segment prevents ambiguity when a city and province share the same slug,
such as Tehran.

Travel videos may be associated with one or more cities or provinces through
`videoDestinations`. Destination persistence and video relationships will be
modeled in Prisma only after the real dataset structure is validated.

**Status:** Active

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
exact normalized Instagram handle. Destination metadata is resolved from
`destinations.json`. `travel-videos.json` does not duplicate person or
destination names, images, follower counts, or descriptions.

**Reason:** A person's profile data can change independently, and one video may
belong to several destinations. Relationship keys prevent stale copies and
keep `sourceUrl` attached to the original Instagram post.

**Status:** Active

## 21. Use Password or Mobile OTP with Opaque Server-Side Sessions

**Decision:** Registration is separate from login and requires mobile OTP
verification, a unique username, and a password. Default login accepts mobile
or username plus password; OTP remains a passwordless/fallback login for an
existing account. Successful authentication sets an HttpOnly, SameSite=Lax
cookie. The raw password, session token, and OTP are never persisted; only
salted `scrypt`, SHA-256, and HMAC hashes respectively are stored.

**Reason:** Explicit registration makes the account lifecycle understandable,
password login avoids an SMS dependency on every visit, and OTP preserves
mobile ownership verification and account access when the password is not used.
Server-side sessions remain revocable. Email remains optional profile metadata.
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

## 23. Moderate Reviews and Comments Before Publication

**Decision:** Hotel reviews and video comments start as `PENDING`; public API
responses include only `PUBLISHED` content. Editing a hotel review returns it to
`PENDING`. One review is allowed per user/hotel.

**Reason:** User-generated content must not bypass the same trust boundary used
elsewhere in Hotel-Yab.

**Status:** Active; protected review/comment moderation UI is implemented

## 24. Attach Comments to the Canonical Video and Keep Them Collapsed

**Decision:** Comments belong to a canonical `Video` record rather than a
destination/person page. The frontend hides the comment panel by default and
loads it only when the user opens it.

**Reason:** One video can appear under several destinations and a person. A
single comment thread prevents duplication, while collapsed UI keeps video
discovery visually focused.

**Status:** Active
