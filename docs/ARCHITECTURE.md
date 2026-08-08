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
- communicating with the backend API.

Main routes currently include:

```text
/
/hotels
/notable-people
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
page
```

Notable people may use:

```text
query
category
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
- notable people.

The frontend handles media rendering and fallback states.

Future content enrichment may include:

- Instagram links;
- videos;
- external source links;
- additional media related to hotel-person associations.

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

Future capabilities may include:

- user accounts;
- saved hotels;
- favorites;
- personalized discovery;
- user contributions.

### Admin and Moderation

A future administration layer may support:

- reviewing records;
- verifying associations;
- managing publication status;
- reviewing submitted sources.

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
7. New subsystems such as authentication and automated sync should be added incrementally as the product requires them.