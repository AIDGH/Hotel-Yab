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

From the repository root, enable the package manager version declared in
`package.json` and install workspace dependencies:

```bash
corepack enable
pnpm install
```

The workspace currently includes projects located under `apps/*` and
`packages/*`.

## Backend API

The NestJS backend is located in `apps/api` and exposes a versioned REST API
under `/api/v1`.

Start the API in development mode from the repository root:

```bash
pnpm api:dev
```

The server listens on port `3000` by default. Verify that it is running:

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:

```json
{
  "status": "ok"
}
```

Run the backend checks from the repository root:

```bash
pnpm api:lint
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

The current phase is repository initialization and backend setup.
