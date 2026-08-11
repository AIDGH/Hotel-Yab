# Hotel-Yab TODO

This file tracks open product and technical work for Hotel-Yab.

---

# Current Priority

## 1. User Features

- [x] Add separate like/save states for hotels
- [x] Add separate like/save states for notable people
- [x] Add a private account library for liked and saved entities
- [ ] Consider personalized discovery after enough behavioral data exists (deferred)

Hotel data enrichment and a fuller Hotel Detail Page continue after the required hotel dataset is ready. Manual data collection continues in parallel and is not blocked by this execution order.

---

# Deferred Core Website Work

- [ ] Complete Notable Person Detail Page
- [ ] Improve hotel/person relationship presentation
- [ ] Complete Hotel Detail Page after its required dataset is ready
- [ ] Improve mobile responsiveness
- [ ] Improve loading states
- [ ] Improve empty states
- [ ] Improve error states
- [ ] Final UI polish for listing and detail pages

---

# 2. Content Enrichment

## Hotel Images

- [ ] Add images for the remaining existing hotels (3 of 15 currently have local hotel-view images)
- [ ] Add or verify logos for the remaining hotels (2 of 15 currently have local logos)
- [ ] Define a consistent image size and format
- [ ] Add fallback image behavior

## Notable Person Images

- [ ] Add images for existing people
- [ ] Verify that each image belongs to the correct person
- [ ] Replace low-quality images where necessary

## Person Information

- [ ] Complete Instagram handles
- [ ] Complete occupations
- [ ] Complete biographies
- [ ] Add missing follower information where needed

## Videos and Sources

- [ ] Find relevant videos for hotel-person relationships
- [ ] Store source links
- [ ] Add Instagram post/reel links where relevant
- [ ] Define how sources and videos should appear on detail pages

---

# 3. Continue Data Collection

- [ ] Add more hotels
- [ ] Add more notable people
- [ ] Add more hotel-person associations
- [ ] Review duplicate records
- [ ] Review incomplete records
- [ ] Review unverified associations
- [ ] Improve overall data quality before large-scale expansion

---

# 4. Second Spreadsheet / Clean Dataset

- [ ] Define the purpose of the second spreadsheet
- [ ] Define the final columns
- [ ] Define unique identifiers for hotels and people
- [ ] Define association structure
- [ ] Define validation rules
- [ ] Define publication fields
- [ ] Prepare existing research data for migration

Planned flow:

```text
Research Spreadsheet
        ↓
Clean Spreadsheet
        ↓
Sync Script
        ↓
PostgreSQL
        ↓
Website
```

---

# 5. Data Sync Script

- [x] Add an idempotent transition importer for destination/video JSON into PostgreSQL
- [ ] Replace the transition importer with a workbook-to-PostgreSQL bulk command and dry-run report
- [ ] Add dry-run checks for missing destination images, MP4 files, thumbnails, slugs, duplicate type-scoped display orders, and unresolved video links
- [ ] Design spreadsheet-to-database sync process
- [ ] Normalize hotel names
- [ ] Normalize person names
- [ ] Match existing database records
- [ ] Prevent duplicate hotels
- [ ] Prevent duplicate people
- [ ] Prevent duplicate associations
- [ ] Validate required fields
- [ ] Handle invalid rows
- [ ] Add dry-run mode before database writes
- [ ] Add sync summary/report
- [ ] Document how to run the sync script

---

# 6. User Accounts

The account foundation is implemented without making login mandatory for public discovery.

- [x] Define why users need accounts
- [x] Design password + mobile OTP authentication flows
- [x] Separate login and registration while keeping discovery public
- [x] Implement mobile/username password login and OTP fallback with revocable sessions
- [x] Add unique username and salted password hashing
- [x] Add strong new-password rules and show/hide password controls
- [x] Render password-format failures as Persian red inline form feedback
- [x] Add six-slot OTP entry with API-backed 60-second resend countdown
- [x] Auto-submit a complete six-digit OTP without requiring Enter or the confirmation button
- [x] Keep signup to mobile/username/password and defer optional profile identity fields to the account page
- [x] Add editable user profile with optional unique email and Instagram
- [x] Add a responsive account layout and validated profile-avatar upload/removal
- [x] Add hotel ratings/reviews with pending moderation
- [x] Add collapsed video comments with hybrid trust/risk moderation
- [x] Add per-user comment rate limiting and user reports with automatic hiding
- [x] Add account activity management for reviews/comments with moderation states and safe deletion
- [x] Add independent likes and saves for hotels and notable people with a private account library
- [ ] Integrate a production SMS provider
- [ ] Consider user-submitted hotel/person information

---

# 7. Admin and Moderation

The contribution-moderation slice and first create-only catalog slice are implemented.

- [x] Define and enforce `USER`, `MODERATOR`, and `ADMIN` roles
- [x] Create hotel-review and video-comment moderation queues
- [x] Add publish/reject/hide/pending actions with moderator identity, time, and note
- [x] Add unresolved comment-report queue and administrator user blocking/reactivation
- [x] Add administrator-only deletion of hotel reviews and video comments from public content
- [x] Add a safe local command to bootstrap an admin/moderator role
- [x] Create administrator-only add forms for destinations, hotels, notable people, and travel videos
- [x] Add multi-destination and optional hotel links while creating a video
- [x] Add an import-compatible catalog JSON export
- [ ] Add edit/archive interfaces for existing destination, hotel, person, and video records
- [ ] Create association review interface
- [ ] Add source verification workflow
- [ ] Add publication controls
- [ ] Add append-only moderation history if latest-decision audit fields are insufficient
- [ ] Add UI for user role management

---

# 8. Technical Improvements

- [ ] Improve validation across API endpoints
- [ ] Improve API error handling
- [ ] Add automated tests
- [ ] Review database indexes
- [ ] Review performance as dataset grows
- [ ] Define production environment
- [ ] Define deployment process
- [ ] Define production media storage
- [ ] Add monitoring and logging when needed

---

# 9. Documentation

- [x] Create `ARCHITECTURE.md`
- [x] Create `DECISIONS.md`
- [x] Create `API.md`
- [x] Create `DATABASE.md`
- [x] Create `DATA_POLICY.md`
- [x] Create `CHANGELOG.md`
- [x] Create `TODO.md`

After the documentation set is complete:

- [ ] Refactor `PROJECT_CONTEXT.md`
- [ ] Remove unnecessary duplicated details
- [ ] Link each detailed document from `PROJECT_CONTEXT.md`
- [ ] Review `README.md`

---

# Suggested Execution Order

```text
1. User Features
```

Manual data collection, content enrichment, and later data-pipeline work run in parallel with this product sequence.

---

# TODO Rules

- Only open work belongs in this file.
- Completed meaningful work should move to `CHANGELOG.md`.
- Technical decisions should go to `DECISIONS.md`.
- Database changes should be documented in `DATABASE.md`.
- API changes should be documented in `API.md`.
- Data-policy changes should be documented in `DATA_POLICY.md`.

## Destination Discovery

- [ ] Add real province dataset and images
- [ ] Model destinations in Prisma/PostgreSQL
- [ ] Expand the reviewed travel-video dataset
- [ ] Move travel videos and video-destination relationships into Prisma after validating the prototype
- [ ] Move destination data into the main data pipeline
