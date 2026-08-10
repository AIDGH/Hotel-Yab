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
- Added optional hotel logos to hotel cards and detail pages.
- Added hotel sorting by name and city.
- Added notable-person sorting by follower count, name, and hotel count.
- Added numeric `followerCount` to notable-person data and API responses.
- Added three licensed hotel-view images and media attribution records.
- Added notable-person metadata to destination travel videos through exact Instagram-handle resolution.
- Added travel videos and their city/province links below notable-person hotel associations.
- Added a shared resolver for the normalized Person → TravelVideo → VideoDestinations → Destination flow.
- Added optional account sessions with mobile verification and revocable HttpOnly cookies.
- Added editable user profiles with first name, last name, username, optional email, and optional Instagram handle.
- Added an optional admin-verified link from a user account to a notable-person record.
- Added hotel ratings and reviews below hotel/person associations, with one review per user/hotel and moderation status.
- Added canonical `Video` records and moderated video comments/replies shared across destination and person pages.
- Added collapsed-by-default comment panels to travel videos.
- Added a responsive header account menu, authentication modal, and `/account` page.
- Added Prisma models, enums, migration, import support, and API modules for accounts, reviews, and comments.
- Added separate verified registration and default password login using mobile or username, while retaining OTP login for existing accounts.
- Added unique site usernames, unique optional Instagram handles, and salted `scrypt` password hashes.
- Added a protected `/admin/moderation` interface and API queue for hotel reviews and video comments.
- Added publish, reject, hide, and return-to-pending moderation actions with moderator identity, decision time, and private note.
- Added a `user:set-role` maintenance command for bootstrapping `ADMIN`/`MODERATOR` access.
- Added published rating average and review count to the hotel-detail API and hero UI.

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
- Switched the primary Vazirmatn font asset from TTF to WOFF2.
- Split follower counts out of `occupation` and kept unknown counts nullable.
- Normalized the Parsian Esteghlal logo filename to the hotel-logo convention.
- Changed photographic media rendering to preserve aspect ratio with `cover`.
- Displayed follower counts in compact Latin form beside occupation with the `·` separator instead of in card relationship metadata.
- Renamed alphabetical sort labels to «الفبا» and made select-based filters build the target URL and perform a full page navigation.
- Added inner spacing and softer corners to hotel-logo frames to prevent visual clipping.
- Made destination type and province selections refresh immediately.
- Kept destination search fixed at three-sevenths of the field area; the remaining four-sevenths belongs to destination type in province mode and splits evenly between type and province in city mode.
- Changed destination video composition to place compact creator metadata above each video, and notable-person destination links in a compact footer below each video.
- Added an in-player `1×/2×` speed toggle and a draggable Reels-style seek bar to travel videos.
- Kept the public discovery experience accessible without requiring login.
- Kept user-submitted reviews and comments private until they are explicitly published by moderation.
- Allowed optional email and Instagram profile fields to be cleared after registration.
- Separated the login and registration UX: login defaults to password, OTP is an alternate path, and registration is offered through an explicit account-creation link.
- Kept legacy OTP-created accounts usable and prompts them to add a username/password after login.

### Fixed

- Fixed the footer destination link to use `/destinations` instead of the removed `/cities` route.
- Fixed Iranian `+98` mobile numbers inside Persian OTP copy by isolating the number as LTR content.

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
