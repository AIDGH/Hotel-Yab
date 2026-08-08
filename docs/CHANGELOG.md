# Hotel-Yab Changelog

All notable changes to Hotel-Yab are recorded in this file.

---

## Unreleased

### Added

- Technical documentation under `docs/`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `API.md`
- `DATABASE.md`
- `DATA_POLICY.md`
- Pagination for hotel and notable-person listings
- Improved notable-person profile metadata
- Instagram handle display
- Occupation display on person cards
- Added initial City Discovery experience.
- Added `/cities` listing page with city search and province filtering.
- Added reusable `CityCard` component with city images.
- Added featured cities to the homepage before hotels and notable people.
- Added Cities navigation item to the main header.
- Added `/cities/[slug]` detail pages with city metadata and a placeholder for notable-person travel content.
- Added unified Destination Discovery for cities and provinces.
- Added `/destinations` with city/province switching, search, and province filtering.
- Added shared destination detail route at `/destinations/[type]/[slug]`.
- Added reusable `DestinationCard` for city and province cards.

### Changed

- Improved hotel and notable-person listing UI
- Unified pagination button styles
- Improved RTL/LTR handling for Persian and Latin content
- Simplified notable-person categories
- Improved frontend data presentation
- Updated notable-people category filter to apply automatically after selection.
- Adjusted listing filter-bar positioning for better visual spacing.
- City province filter now applies automatically after selection.
- Improved city detail pages with a full-width image hero.
- Improved province badge readability on city hero images.
- Replaced Cities navigation with Destinations across the header and footer.
- Updated the homepage discovery section from cities to destinations.
- Consolidated prototype city and province data into `destinations.json`.
- Limited destination card descriptions to two lines to keep card layouts consistent.

### Removed

- Removed legacy `/cities` routes.
- Removed the legacy `CityCard` component and separate city/province prototype JSON files.

---

## Initial Development

### Project Setup

- Created Hotel-Yab monorepo
- Created Next.js frontend in `apps/web`
- Created backend application in `apps/api`
- Added TypeScript
- Added PostgreSQL
- Added Prisma ORM

### Database

- Created core hotel data model
- Created notable-person data model
- Created hotel-person association structure
- Added publication-related fields
- Added slugs for public entities

### Frontend

- Created home page
- Created hotel listing page
- Created notable-person listing page
- Added reusable hotel cards
- Added reusable person cards
- Added search and filtering
- Added empty and unavailable states
- Added Persian RTL interface
- Added Vazirmatn font support

### Data

- Added initial hotel dataset
- Added initial notable-person dataset
- Added hotel-person relationship data
- Added initial biography, occupation, image, and Instagram fields

---

## Changelog Rules

Add an entry when a meaningful product or technical change is completed.

Use these categories when appropriate:

- `Added`
- `Changed`
- `Fixed`
- `Removed`
- `Deprecated`

Small refactors, formatting changes, and temporary experiments do not need to be recorded unless they materially affect the project.