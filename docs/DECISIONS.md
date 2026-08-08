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
- Other

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

## 14. User Accounts Are Not an MVP Requirement

**Decision:** Authentication and user accounts should not be prioritized before the core discovery experience is mature.

Core priorities currently include:

- hotel discovery;
- notable-person discovery;
- relationship data;
- content quality;
- search;
- detail pages;
- data pipeline.

Potential future user features include:

- favorites;
- saved hotels;
- personalization;
- user contributions.

**Reason:**

Authentication adds significant product and technical complexity but does not yet improve the core value proposition enough to justify being an early dependency.

**Status:** Planned for a later phase

---

## 15. Admin and Moderation Will Be Added When Required

**Decision:** Do not build a large admin system prematurely.

A future admin/moderation layer may support:

- editing hotels;
- editing notable people;
- reviewing associations;
- verifying sources;
- controlling publication status.

**Reason:**

The exact moderation workflow should be based on the real data-management process rather than assumptions made too early.

**Status:** Planned

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

## City-Based Discovery

Hotel-Yab supports discovery not only through hotels and notable people, but also through destinations.

The City Discovery flow is:

City → Notable Person → Travel Content / Videos

Cities are introduced first through lightweight prototype data and UI. Dedicated database models for cities, visits, and travel videos will be added after the real dataset structure is validated.