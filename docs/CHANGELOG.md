# Hotel-Yab Changelog

All notable changes to Hotel-Yab are recorded in this file.

---

## Unreleased

- Added Moderator-only background processing for reviewed crawler batches: the
  admin page can now run media download/preparation, import dry-run, and final
  API apply sequentially while persisting status and bounded logs in PostgreSQL.
  Administrators retain review/export access but cannot start the server job;
  interrupted jobs are marked failed and retryable when the API restarts.
- Provisioned the production crawler Python runtime and private Instaloader
  session, but kept direct processing disabled after confirming that the current
  datacenter network cannot reach Instagram. Automatic Git/code deployment and
  public services remain independent and healthy.
- Added a production systemd timer that checks GitHub once per minute and runs a
  locked, checked-in deployment path only when `main` has changed. The safe
  deploy performs a fast-forward pull, dependency/migration/build steps,
  systemd restart, and retrying health checks. It explicitly resolves the
  server's NVM-managed Node/pnpm path and requires no VPS private key in GitHub.
  The timer is installed, enabled, and successfully checking production.
- Made existing administrator roles immutable through staff account management,
  including attempts made by a moderator, while preserving the separate
  moderator administrator-review page for profile/status operations.
- Changed the public header action to «ورود / ثبت‌نام» and refreshed the home
  hero message around seeing other people's experiences before choosing a
  destination.
- Activated the approved Najva OTP provider in production with the configured
  sender, WebOTP hostname, and whitelisted VPS IP. The first real login-OTP
  request was accepted successfully by Najva without exposing a development
  code, and delivery to the handset was confirmed.
- Added a PostgreSQL-backed admin crawler-review queue at
  `/admin/crawl-reviews`: administrators and moderators can upload crawler JSON,
  review paginated candidates, choose canonical cities/provinces and an optional
  hotel, approve/reject rows, download a reviewed machine JSON export, and mark
  processed batches complete. Added compatible JSON input to the existing
  approved-media downloader/importer so the normal workflow no longer requires
  generating or editing XLSX; legacy reviewed workbooks remain supported.
- Added a resumable authenticated Instagram Highlight downloader that accepts
  multiple direct Highlight URLs, preserves their ordered mixed media, converts
  images and video covers to WebP, keeps videos as MP4, and writes directly to
  stable hotel/travel public paths with collision-safe local manifests.
- Added an explicit dry-run/apply Highlight manifest importer that resolves
  canonical people, hotels, and destinations and creates one ordered mixed-media
  content record through the protected Admin Catalog API.
- Allowed Highlight curators to delete unwanted downloaded items before import;
  missing media is skipped while the surviving non-contiguous filenames retain
  their original relative order in a contiguous database display sequence.
- Kept the user's mute choice across vertical content navigation in the shared
  Explore viewer, so unmuting one item no longer mutes the next item again.
- Allowed separate content records to reuse the same original source URL while
  preserving unique canonical content IDs. Added a database migration that
  removes the old `Video.sourceUrl` unique index; the reviewed-workbook importer
  remains source-idempotent to prevent accidental duplicates on reruns.
- Preserved the relationship category, title, place name/type, destinations,
  and related hotels after successfully creating catalog content, while
  resetting all other inputs to their empty or default values for faster batch
  entry.
- Replaced the hotel-detail page's standalone creator/video cards with the
  shared Explore cover grid and full-screen viewer on desktop and mobile. Hotel
  content now uses the same multi-item navigation, comments sheet, creator
  resolution, and progressive 12-desktop/9-mobile batching as `/explore`.
- Enabled full editing of existing catalog content for administrators and
  moderators. The form now loads and saves titles, metadata, creator, status,
  destination/hotel relationships, and ordered mixed-media items through a new
  transactional `PATCH /admin/catalog/videos/:id` route while preserving the
  canonical content ID and its comments.
- Refined Highlight-style multi-item navigation with subdued background-free
  edge arrows on desktop, no mobile arrows, desktop left/right keyboard and
  side-click controls, and a mobile horizontal drag that exposes the adjacent
  item continuously without changing vertical content navigation. Active
  segments now fill from video time or a five-second image timer; holding the
  center pauses timing/playback and hides overlays, while holding either video
  edge temporarily plays at 2×. Approved imports now make duplicate titles safe
  by appending the first available numeric suffix (`2`, `3`, ...). Expanded the
  Commands PDF and workbook guide with stage-specific
  recovery instructions, including rebuilding a truncated video thumbnail from
  its already-downloaded MP4.
- Added authenticated Instagram media refresh from an existing Chrome session,
  avoiding terminal password/checkpoint loops and persisting a local Instaloader
  session for later approved-media downloads. Per-post unavailable/restricted
  failures now produce a resumable local report instead of aborting the whole
  batch, while incomplete approved batches are prevented from media preparation.
- Rebuilt the full 14-page Commands PDF with B Nazanin Persian body typography,
  IranSansDN Bold headings, stable LTR code/URL rendering, and the ordered crawl,
  JSON-to-XLSX, approved-media preparation, dry-run, and explicit apply workflow.
- Added an approved-workbook Instagram media downloader with dry-run output,
  automatic fallback to fresh Instaloader metadata, resumable local per-post
  manifests, mixed image/video carousel support, and final preparation into the
  correct travel/hotel public folder. Upgraded `import_approved.py` to emit
  `contentKind` and ordered `mediaItems` while retaining legacy plan support.
- Renamed the public Explore navigation and page label to «محتواها», allowed both posts and stories/highlights to contain any ordered mix of images and videos, and added per-item media-type selection to the admin catalog.
- Unified destination search results across matching cities and provinces, enlarged and repositioned select chevrons across the interface, and reduced Explore batches to 12 desktop items and 9 mobile items to lower initial media load.
- Added canonical `VIDEO`/`POST`/`STORY` content formats with ordered image/video media items, a backward-compatible database migration for all existing videos, full import/export/API plumbing, multi-item catalog authoring with path suggestions and reordering, and one Highlight-style viewer shared by Explore and destination/hotel/person pages.
- Reduced authenticated sessions to an absolute 24-hour lifetime and enforced the same ceiling for previously issued sessions with longer stored expiries.
- Accepted Persian and Arabic-Indic digits in Iranian mobile numbers and OTP codes across the authentication UI and API, including password login, OTP login, and registration.
- Added a repeatable import-compatible catalog export command and documented the safe code/catalog/media production deployment workflow without replacing production user data.
- Added an explicit temporary production OTP preview mode, a dedicated mobile-number step before passwordless login, LTR login identifiers, and right-aligned password visibility controls.
- Fixed import validation so stable root-relative catalog media paths and valid Unicode HTTP source URLs round-trip through the database export/import workflow.
- Made destination-order imports collision-safe by clearing existing positions inside the same transaction before applying the exported order.
- Added 10 internationally recognized Hotel Abbasi guests from the hotel's official guest-testimonial page as published notable people with verified, evidence-backed hotel associations and locally prepared profile portraits.
- Added an address tooltip to the hotel-detail location label, available through pointer hover and keyboard focus when the hotel has a stored address.
- Balanced hotel-detail hero typography to match the more restrained notable-person detail hierarchy, with a slightly smaller hotel name.
- Preserved pending and verified hotel associations in public counts/details while removing status badges and source/evidence lists from hotel guest cards; the entire hotel-video section is omitted when no published video exists.
- Removed association-status badges from hotel cards and suppressed the missing-follower placeholder on hotel guest cards.
- Added a compact three-column, 12-item mobile Explore thumbnail grid that opens into a full-screen vertical Reels viewer with browser-back handling and a bottom-sheet comments panel; desktop fullscreen playback now also supports previous/next navigation.
- Refined video navigation with correctly mapped desktop fullscreen arrows, keyboard left/right support and click suppression during transitions; mobile Reels now supports hold-to-play-at-2× zones and lighter Instagram-style overlay controls.
- Refined the mobile Explore flow by separating its grid from the search filters, centering the comments glyph, removing the visible 2× badge and automatically appending the next 12 reels at the end of the feed; desktop videos now pause when fullscreen exits.
- Refined account navigation by moving «فعالیت‌های من» below the saved-items entry, compacting mobile drawers, aligning the mobile account identity row, animating menu exits, simplifying account field guidance, and hiding the public Footer on account routes.
- Added a production-safe disabled SMS provider mode so missing Najva credentials no longer prevent the API from starting; OTP requests return a controlled `503` without exposing a development code while password login and the rest of the API remain available.
- Fixed mobile hotel-detail horizontal overflow, hid all Reels overlays during hold-to-2× playback, disabled unstable search-as-you-type navigation in favor of explicit form submission, and shortened public destination-type options to «شهر» and «استان».
- Fixed the catalog image replacement confirmation appearing behind the upload dialog and cleared its pending state when the upload dialog is dismissed, so later save attempts remain responsive.
- Replaced the desktop Explore card list with a four-column thumbnail grid and full-screen vertical Reels viewer, loading 16 videos per batch, and arranged mobile hotel detail actions into two balanced rows.
- Removed public «در حال تکمیل» labels and placeholder copy from person/hotel cards, person details, and destination empty states; pending records remain functional without exposing completion-status wording.
- Replaced public notable-person category badges with their actual occupations and removed the repeated occupation from the follower metadata line, while retaining category data for filtering and administration.
- Preserved the person-card metadata slot when Instagram/follower data is absent so hotel-association rows stay aligned across the people grid.
- Aligned the desktop Explore header and four-column video grid with the filter bar, constrained desktop Reels overlays to the portrait video frame, tightened the mute/comments action spacing, and fixed the comments sheet so it stays horizontally centered throughout its opening animation.
- Preserved a notable person's occupation label when it is identical to the person's category instead of leaving the card heading blank.
- Balanced notable-person detail typography, stacked Instagram above follower count, moved detail-page back links to the left edge, added title/destination overlays to desktop Explore thumbnails, and reduced the desktop Reels comments control to its icon.
- Kept notable-person edit choices alphabetically sorted, but reset both hotel and notable-person editors to their selection state after each successful update instead of automatically advancing or retaining the edited record.

### Added

- Added a reusable SVG icon set for Header, account navigation, entity cards, status/location states, Footer contact details, and mobile drawers.
- Added responsive site-owned confirmation dialogs for account-activity deletion, catalog deletion, and media replacement instead of native browser confirmations.
- Added debounced two-character live search plus shared Persian normalization for Arabic letter forms, alef variants, diacritics, whitespace, and half-space.
- Added the approved Najva `HotelYabOTPTemplate` adapter for registration/login
  OTP delivery, including server-only API-key/sender/origin configuration,
  Tehran send-time and WebOTP tokens, explicit development delivery mode,
  provider timeout handling, failed-challenge cleanup, and unit coverage.
- Added `/admin/users` for non-admin account management and a separate moderator-only `/admin/administrators` page for reviewing administrator accounts.
- Added inline-confirmed permanent deletion for hotel reviews and video comments directly inside the moderation queue.
- Added reusable six-at-a-time progressive rendering to destination, hotel, and notable-person video sections.
- Added published travel and hotel videos directly to notable-person detail responses.
- Deployed the first live Hotel-Yab production prototype to an ArvanCloud Ubuntu 24.04 VPS, with Nginx as the public entry point and enabled systemd services for Next.js and NestJS.
- Added the production PostgreSQL 17 runtime, restored the canonical application data, and verified deployment-time counts of 18 hotels, 157 notable people, 35 destinations, and 38 videos.
- Added a daily systemd PostgreSQL custom-format backup at 03:00 UTC with local retention under `/var/backups/hotel-yab`.
- Added production firewall rules that keep application/database ports private while allowing SSH, HTTP, and future HTTPS.
- Provisioned ignored hotel/person/travel/hotel-video media to the VPS filesystem separately from Git.
- Completed `import_approved.py --apply` through the protected Admin Catalog API and successfully imported the first 32 approved Instagram travel/hotel videos.
- Added production same-origin API routing in Nginx so `/api/*` reaches NestJS while normal routes reach Next.js.
- Added a browser-based Instagram follower collector under
  `tools/instagram-follower-tracker` using a persistent local Playwright
  profile, sequential public-profile reads, read-only bulk scans, JSON reports,
  and an explicit `--apply` mode.
- Added `NotablePerson.followersUpdatedAt` and daily `FollowerSnapshot` history
  with a uniqueness constraint on person + snapshot date.
- Added administrator-only `POST /admin/catalog/followers` to transactionally
  update the latest follower count/timestamp and upsert daily snapshots; the
  first full applied scan refreshed all 149 current notable-person records after
  correcting two invalid Instagram handles.
- Added Instagram travel-discovery tooling under
  `tools/instagram-travel-finder`: GraphQL timeline collection,
  checkpoint/resume, high-recall detector scoring with HOTEL priority,
  JSON-to-XLSX human review, approved-row dry-run diagnostics, and the protected
  approved-row Admin API apply path.
- Added catalog API update routes for destinations, hotels, and notable people,
  catalog deletion routes, and a catalog media-upload endpoint.

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

- Darkened the primary purple palette, widened the desktop account form into two columns, and replaced the mobile navigation/account popovers with mutually exclusive full-height left drawers and a dimmed backdrop.
- Replaced the Footer transparency block with phone/Instagram contact details, expanded homepage quick destinations, and hid the homepage process/data-contribution sections.
- Removed incomplete evidence, research-status, and empty travel-video copy from notable-person associations that have no connected media/source.
- Made mobile authentication inputs use a Safari-safe 16px font size to prevent focus zoom.
- Split Hotel Detail into a video-first introduction section and a compact notable-guest grid.
- Removed the two-published-comment threshold; clean user comments now publish immediately while risk signals still enter moderation.
- Made `ADMIN` and `MODERATOR` hotel reviews and video comments bypass premoderation.
- Made hotel logos fill and inherit the rounded clipping of their frame without a separate white inset, and removed the Instagram verification note from the account form.
- Embedded hotel-category videos inside their matching hotel association on notable-person pages, compacted the account form card, removed research-state copy from hotel guest cards, and opened catalog/user management to moderators.
- Split hotel guest occupation and follower count onto separate lines and removed the generic guest label.
- Reduced `NotablePersonCategory` to the active five-value taxonomy:
  `ACTOR`, `ATHLETE`, `INFLUENCER`, `MUSICIAN`, and `PUBLIC_FIGURE`; the unused
  `CREATOR`, `ENTREPRENEUR`, `POLITICIAN`, and `OTHER` enum values were removed
  after confirming no current person rows used them.
- Changed follower maintenance from manually stale snapshot values to a
  timestamped refresh workflow that preserves the latest value on
  `NotablePerson` and daily history in `FollowerSnapshot`.
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

- Normalized production media references that still used `http://localhost:3000/...` into stable relative paths before serving them publicly.
- Corrected the production Web `API_BASE_URL` to include `/api/v1`, avoiding server-side requests to the wrong NestJS path.
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
