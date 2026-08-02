# Hotel-Yab

Hotel-Yab is a hotel discovery platform designed to help users find hotels and explore verified information about celebrities, influencers, actors, artists, and other notable people associated with each hotel.

## Project Status

The project is currently in the initial development phase.

The first development milestone is to build the backend API, database structure, user authentication, and the core hotel data model.

## Planned Technology Stack

### Web Application

- Next.js
- React
- TypeScript

### Backend

- Node.js
- NestJS
- TypeScript

### Database

- PostgreSQL
- Prisma ORM

### Future Mobile Application

- React Native
- Expo
- TypeScript

## Initial MVP Features

The first usable version of Hotel-Yab is planned to include:

- User registration and authentication
- Hotel listing
- Hotel detail pages
- City-based hotel search
- Celebrity and influencer profiles
- Connections between hotels and notable people
- Source and verification status for each connection
- User favorites
- Basic administration panel

## Architecture

The project will initially use a modular monolith architecture.

The web application, future mobile application, and administration panel will communicate with a centralized backend API.

```text
Next.js Web App ───────┐
                       ├── NestJS API ── PostgreSQL
React Native App ──────┘
```

## Repository Structure

The planned repository structure is:

```text
Hotel-Yab/
├── apps/
│   ├── api/
│   ├── web/
│   └── mobile/
├── packages/
├── README.md
└── .gitignore
```

The `mobile` application will be added in a future phase.

## Package Management

Hotel-Yab uses pnpm workspaces to manage applications and shared packages in a
single repository.

### Prerequisites

- Node.js
- Corepack
- PostgreSQL 17

From the repository root, enable the package manager version declared in
`package.json` and install workspace dependencies:

```bash
corepack enable
pnpm install
```

The workspace currently includes projects located under `apps/*` and
`packages/*`.

## Local Database Setup

Start the Homebrew PostgreSQL service on macOS:

```bash
brew services start postgresql@17
```

Create separate development and test databases once:

```bash
createdb hotel_yab
createdb hotel_yab_test
```

Create the local environment files from their committed examples:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
```

In both copied files, replace `YOUR_MACOS_USERNAME` with the value returned by:

```bash
whoami
```

Generate and validate Prisma Client after installing dependencies:

```bash
pnpm api:prisma:generate
pnpm api:prisma:validate
```

Create a new development migration after changing the Prisma schema:

```bash
pnpm --filter @hotel-yab/api exec prisma migrate dev --name migration_name
```

Apply committed migrations without creating new ones:

```bash
pnpm api:prisma:migrate:deploy
```

Local `.env` files and generated Prisma Client code are intentionally excluded
from Git.

## Core Data Model

The verified relationship graph is modeled as:

```text
Hotel ──< HotelAssociation >── NotablePerson
                    │
                    v
          AssociationEvidence
                    │
                    v
                  Source
```

`HotelAssociation` stores the claim and its verification status. `Source`
stores reusable source metadata and a unique URL. `AssociationEvidence` links
one or more sources to a claim. Public discovery endpoints will only expose
published records with verified associations.

## Curated Data Import

Data is imported locally instead of exposing an unauthenticated write API.
Create a private working file from the committed template:

```bash
cp apps/api/prisma/data/import.example.json apps/api/prisma/data/import.json
```

Replace the template values with researched data, then run:

```bash
pnpm api:data:import
```

The importer validates the complete file before writing and applies it in a
single database transaction. Every association must reference at least one
source from the same file. A verified association must also include a
`verifiedAt` ISO timestamp.

Hotel and notable-person slugs, source URLs, and association `referenceKey`
values are stable unique identifiers. Re-importing the same file updates those
records instead of creating duplicates. New records default to `DRAFT` and new
associations default to `PENDING`, so imports are not public accidentally.

The private `import.json` file is excluded from Git. The committed example is a
format template only and is not real Hotel-Yab data.

## Backend API

The NestJS backend is located in `apps/api` and exposes a versioned REST API
under `/api/v1`.

Current public endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Check API and database readiness |
| `GET` | `/api/v1/hotels` | List public hotels with verified associations |
| `GET` | `/api/v1/hotels/:slug` | Get a hotel, notable people, and evidence sources |
| `GET` | `/api/v1/notable-people` | List public notable people with verified associations |
| `GET` | `/api/v1/notable-people/:slug` | Get a person, associated hotels, and evidence sources |

Hotel list filters are `page`, `pageSize`, `query`, `city`, and `countryCode`.
Notable-person list filters are `page`, `pageSize`, `query`, `category`, and
`countryCode`. Page size is limited to 100 records.

Public discovery results only include published hotels and notable people whose
associations are verified and backed by at least one evidence source.

Start the API in development mode from the repository root:

```bash
pnpm api:dev
```

The API listens on port `4000` by default, leaving port `3000` available for the
future Next.js frontend. Verify that it is running:

```bash
curl http://localhost:4000/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "up"
}
```

Explore and execute the API in Swagger UI while the development server is
running:

```text
http://localhost:4000/api/docs
```

The OpenAPI JSON document is available at:

```text
http://localhost:4000/api/docs-json
```

Run the backend checks from the repository root:

```bash
pnpm api:format:check
pnpm api:lint
pnpm api:typecheck
pnpm api:test
pnpm api:test:e2e
pnpm api:build
```

Format backend files or apply automatic lint fixes explicitly:

```bash
pnpm api:format
pnpm api:lint:fix
```

## Development Approach

Development will proceed incrementally.

Each major step should:

1. Have a clear purpose.
2. Be explained before implementation.
3. Be tested locally.
4. Be committed separately.
5. Keep the main branch in a working state.

## Current Phase

The current phase is core backend data modeling and API development.
