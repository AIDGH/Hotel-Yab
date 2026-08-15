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
- Added nullable official 1–5 hotel star ratings to Prisma, imports, APIs, hotel cards, and hotel detail pages.
- Added unique video-comment reports with categorized reasons and optional private details.
- Added automatic hiding after three independent unresolved reports and a reported-comments admin queue.
- Added administrator-only user blocking/reactivation with immediate session revocation on block.
- Added an accessible show/hide control to password fields in login, registration, legacy-profile completion, and account password changes.
- Added compact mobile, username, and strong-password guidance between each field label and input.
- Added a six-slot OTP entry control and resend countdown driven by the API's 60-second cooldown.
- Added automatic OTP submission as soon as all six digits are entered or pasted.
- Added related hotel cards below destination travel videos, with city matching, province-level city aggregation, deduplication, counts, and empty/unavailable states.
- Added `/explore` with reusable creator/video/destination composition, title/creator/destination search, automatic destination filters, result counts, and empty states.
- Added Explore navigation links to the main header and footer.
- Added `/search` with grouped hotel, notable-person, city, and province results, per-group counts and links, partial API failure handling, and a unified no-result state.
- Added client-side progressive Explore loading: six videos initially and six more per button press without a page refresh.
- Added authenticated account-activity APIs and an «فعالیت‌های من» section for reviewing moderation states, opening related content, and safely deleting owned reviews/comments.
- Added authenticated profile-avatar upload, retrieval, and removal with JPEG/PNG/WebP signature checks, a 1 MB limit, and a separate `UserAvatar` model.
- Added a responsive account sidebar with profile summary and direct navigation to account, activity, moderation, and logout.
- Added independent hotel and notable-person likes and saves backed by four uniqueness-protected Prisma relations and authenticated idempotent endpoints.
- Added reusable like/save controls to hotel/person cards and detail pages, with login prompting for guests and shared client-side library state for signed-in users.
- Added `/account/library` with separate liked and saved sections for hotels and notable people, linked from the account menu and sidebar.
- Added administrator-only, inline-confirmed permanent deletion controls for published hotel reviews and video comments/replies.
- Added three more Morteza Kowsari travel-video records, five new video–destination links, and normalized destination metadata for Isfahan, Hormozgan, Fars, Qeshm, and Firuzabad from the private destination workbook.
- Added canonical `Destination`, enriched `Video`, `VideoDestination`, and `VideoHotel` Prisma models with an applied PostgreSQL migration.
- Added public destination/travel-video APIs and switched discovery pages from direct runtime JSON imports to API-backed PostgreSQL data.
- Added the administrator-only `/admin/catalog` interface for creating destinations, hotels, notable people, and multi-linked travel videos using existing `public` media paths.
- Added a complete catalog JSON export plus extended idempotent import validation for destinations, enriched videos, and their destination/hotel references.
- Added `data:import-travel` to migrate the existing destination/video transition JSON without moving media files.
- Added published `VideoHotel` media to hotel-detail API responses and render each video inside the matching creator's hotel-association card.
- Added explicit `TRAVEL`/`HOTEL` video categories, slug-based editable media-path suggestions, searchable click-to-toggle destination/hotel selection, and automatic pending person–hotel associations for newly linked catalog videos.
- Added free-typing suggestion lists for creator category and place type in the admin video form.
- Added free-typing content-type suggestions (`POST`, `REEL`, `STORY`, `HIGHLIGHT`, and others) plus searchable single-selection for video creators in the admin catalog.

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
- Changed automatic cross-video pausing to show the paused video's thumbnail while preserving its playback position for later continuation.
- Kept the public discovery experience accessible without requiring login.
- Kept user-submitted reviews and comments private until they are explicitly published by moderation.
- Allowed optional email and Instagram profile fields to be cleared after registration.
- Separated the login and registration UX: login defaults to password, OTP is an alternate path, and registration is offered through an explicit account-creation link.
- Kept legacy OTP-created accounts usable and prompts them to add a username/password after login.
- Compressed registration fields into a wider four-row desktop layout with shorter inputs so the complete form fits without internal scrolling.
- Moved full registration validation and uniqueness checks before OTP delivery.
- Separated official hotel classification from user-review scores; review scores now use `x.x از ۵` and `n نظر` without a star icon.
- Formatted visible Iranian mobile numbers as `+98 991 123 4567` while preserving normalized API values.
- Changed video comments from universal premoderation to hybrid trust/risk moderation: clean comments from users with two published comments publish immediately, while new, linked, repeated, or risky submissions remain pending.
- Limited each user to five video-comment submissions per rolling minute.
- Refined hotel, notable-person, and destination detail pages with a subtle layered background, translucent profile surface, and deeper destination hero while preserving the minimal visual language.
- Reduced website registration to name, family name, `09…` mobile, username, and password; optional email and Instagram now move to the account page.
- Enforced lowercase, uppercase, digit, and symbol requirements for newly created or changed passwords while preserving legacy password login.
- Reset incompatible Explore destination selections automatically when the destination type changes.
- Routed the homepage hero search to Global Search instead of the hotel-only listing.
- Moved the Videos navigation item after Notable People in both the header and footer.
- Prevented deletion of a video comment that already has replies, preserving other users' contributions.
- Moved «فعالیت‌های من» out of the profile form into its own `/account/activity` route and account-menu item.
- Reduced registration to mobile, username, and password; name, family name, email, Instagram, and avatar are completed later from the account page.
- Reworked the account page into a wider two-column laptop layout with compact single-column fields and a stacked mobile layout.
- Reduced optional hotel-review text minimum from 10 to 3 characters.
- Allowed authenticated users to comment before completing first and last name, using «کاربر هتل‌یاب» as the public fallback label.
- Left the admin video form's content type, place type, and creator category empty initially instead of preselecting metadata values.

### Fixed

- Removed an accidentally tracked hotel video and thumbnail from the current repository tree, and ignored all local public content-media directories to prevent future commits.
- Closed the Header account menu automatically after client-side route changes.
- Fixed the footer destination link to use `/destinations` instead of the removed `/cities` route.
- Fixed Iranian `+98` mobile numbers inside Persian OTP copy by isolating the number as LTR content.
- Fixed duplicate email/username/Instagram/mobile errors appearing only after the user reached the OTP verification step.
- Clarified the optional Instagram field note on the account profile.
- Unified the user-score number and `از ۵` typography in both hotel rating summaries, and localized the lower summary number to Persian digits.
- Rendered Persian hotel-rating decimals with a visible period (`۴.۵`) and enlarged the header login icon.
- Fixed LAN access for authentication, hotel reviews, and video comments by proxying browser `/api/v1` requests through the Next.js origin instead of hard-coding browser-side `localhost:4000`.
- Reset the hotel-review form after submission and page reload while retaining the previous review's moderation status and replacement behavior.
- Fixed duplicate/self-report errors appearing only after closing the video-comment report form; errors now render immediately inside the open form.
- Fixed account-profile saves hiding the API error behind a generic message; duplicate/invalid email, username, Instagram, password, mobile, and expired-session errors now have specific Persian messages.
- Prevented password managers from autofilling the current password into the optional new-password field during unrelated profile edits.
- Kept `import.json` backward-compatible: legacy ID-only video rows no longer clear enriched video metadata or relationship links.
- Standardized negative form feedback across authentication, account, hotel reviews, video comments, reports, and administration as red error states while keeping successful feedback green.
- Prevented the hotel-review paragraph style from overriding shared red error text, and replaced the native short-review error with a Persian inline message.
- Registered the missing canonical `morteza.kowsari-002` video in the backend import dataset so its comments load and submit normally.
- Replaced the misleading profile-completion comment error with cause-specific Persian feedback and made a failed comment-list load retryable.
- Replaced native English password-format validation bubbles with the shared Persian red inline error across login, registration, legacy completion, and account editing.
- Derived city/province image paths from destination type and slug, kept their display-order sequences independent, and normalized Persian parent-province values to canonical slugs.
- Scoped the private `data/` ignore rule to the repository root so app-runtime JSON under `apps/web/src/data/` can be committed and deployed.

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
