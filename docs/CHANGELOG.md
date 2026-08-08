# Hotel-Yab Changelog

All notable changes to Hotel-Yab are recorded in this file.

---

## Unreleased

### Added

- Added initial City Discovery experience.
- Added `/cities` listing page with city search and province filtering.
- Added reusable `CityCard` component with city images.
- Added featured cities to the homepage before hotels and notable people.
- Added Cities navigation item to the main header.

### Changed

- City province filter now applies automatically after selection.

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