# Hotel-Yab TODO

This file tracks open product and technical work for Hotel-Yab.

---

# Current Priority - Week 4 (2026-08-22 to 2026-08-25)

## 1. Production Stabilization and Server Workflow

- [x] Deploy the current application to the ArvanCloud VPS.
- [x] Run Next.js and NestJS as enabled `systemd` services.
- [x] Put Nginx in front of the application.
- [x] Route public `/api/v1` traffic to the NestJS service and normal web traffic to Next.js.
- [x] Restore the canonical PostgreSQL data on production.
- [x] Provision production media separately from Git.
- [x] Enable UFW with only SSH/HTTP/HTTPS public.
- [x] Configure and validate a daily PostgreSQL custom-format backup timer.
- [x] Verify API/Web/Nginx automatically return after a full VPS reboot.
- [ ] Fix the production auth/session bug where a signed-in user may appear logged out after page refresh.
- [ ] Learn and document the repeatable laptop -> Git -> production update workflow for code, migrations, data, and media.
- [ ] Connect the final domain to the VPS.
- [ ] Enable HTTPS with a valid certificate.
- [ ] Update the production canonical origin/CORS/cookie configuration after the domain is active.

## 2. Production Authentication

- [x] Integrate the approved Najva OTP template for registration/login delivery.
- [x] Keep production API/password login available with a safe disabled SMS mode until Najva credentials arrive.
- [ ] Configure the Najva API key/sender/WebOTP hostname on production and verify account credit and real delivery.
- [ ] Test OTP resend cooldown, provider failure handling, and production delivery end-to-end.
- [ ] Decide whether email is actually required for MVP before integrating a provider.

## 3. Crawler and Data Growth

- [x] Implement approved Instagram review XLSX `--apply` through the protected Admin Catalog API.
- [x] Apply the first reviewed production batch successfully; 32 approved travel/hotel videos were imported.
- [x] Verify the resulting canonical PostgreSQL/video relationships and public-site output.
- [ ] Reduce manual steps in the Instagram crawler workflow and make repeated profile runs easier.
- [ ] Add a practical batch/profile queue around the existing checkpoint/resume crawler.
- [ ] Continue collecting more reviewed travel and hotel videos.
- [ ] Complete missing hotel fields, images, logos, and official metadata.
- [ ] Complete missing notable-person image, Instagram, occupation, biography, and follower metadata.

## 4. Immediate Website Bugs

- [x] Fix missing/incorrect hotel-logo rendering cases in production.
- [x] Fix hotel-category videos that should appear on notable-person detail pages but currently do not.
- [ ] Regression-test media URLs after production path normalization.

---

# Week 5 (2026-08-29 to 2026-09-01)

## Product and Admin

- [x] Separate the Hotel Detail concepts of «people connected to this hotel» and «influencer/hotel videos» instead of presenting them as one mixed block.
- [x] Improve high-value icons and small UI states across Hotel, Person, Explore, and Account pages.
- [x] Add an administrator view for website users with search and basic account status information.
- [x] Prevent an `ADMIN` from blocking/suspending another `ADMIN`.
- [x] Add a separate moderator-only administrator review page.
- [x] Re-check role hierarchy and avoid staff self-lockout/peer-lockout scenarios.
- [ ] Continue crawler automation and data enrichment in parallel.
- [ ] Run a focused regression pass on Auth, Admin, Hotel, Person, and Media after the Week 5 changes.

---

# Content Enrichment

## Hotel Images and Metadata

- [ ] Complete missing main images and logos for current hotels.
- [ ] Define and enforce a consistent image size/format policy.
- [ ] Keep fallback image behavior clean when media is missing.
- [ ] Continue expanding the hotel catalog beyond the current production set.

## Notable People

- [ ] Complete missing images.
- [ ] Verify image/person matches.
- [ ] Complete Instagram handles, occupations, biographies, and other stable profile fields.
- [ ] Continue follower refreshes without treating follower count as evidence.

## Associations and Sources

- [ ] Review incomplete/pending hotel-person associations.
- [ ] Attach reviewed public evidence where available.
- [ ] Reject weak/incorrect associations instead of guessing.
- [ ] Build the association/source review UI when the manual workflow is clear enough.

---

# Data Pipeline

- [x] Keep Destination/Video/PostgreSQL as the canonical runtime source.
- [x] Add checkpoint/resume Instagram travel crawling and high-recall candidate detection.
- [x] Add JSON -> XLSX human review.
- [x] Add approved-row dry-run validation.
- [x] Add approved-row Admin API apply.
- [x] Import the first reviewed 32-video batch successfully.
- [ ] Add a clearer post-apply summary for created/skipped/blocked rows if current output is not sufficient.
- [ ] Add stronger validation for media paths, thumbnails, duplicate display orders, and unresolved relations before future bulk apply.
- [ ] Keep all generated crawler output, browser/session data, and request captures local-only.
- [ ] Consider a generalized workbook-to-PostgreSQL bulk tool only when the real workflow needs it.

---

# User Accounts

- [x] Password + mobile OTP authentication foundation.
- [x] Revocable server-side sessions with HttpOnly cookie.
- [x] User profile and avatar.
- [x] Hotel reviews and video comments.
- [x] Private account activity.
- [x] Independent likes/saves and private library.
- [ ] Fix production refresh/session persistence behavior.
- [x] Add the production Najva template adapter and environment validation.
- [ ] Activate Najva credentials and verify live OTP delivery on production.
- [ ] Consider user-submitted hotel/person data later, behind moderation.

---

# Admin and Moderation

- [x] `USER`, `MODERATOR`, `ADMIN` roles exist.
- [x] Review/comment/report moderation queues exist.
- [x] Admin blocking/reactivation exists for normal users.
- [x] Catalog create/update for current canonical entities exists.
- [x] Catalog delete endpoints exist.
- [x] Catalog export exists.
- [x] Add safe user-list UI for staff.
- [x] Finalize staff-to-staff blocking rules.
- [x] Give `MODERATOR` access to users, a separate administrator review page, and catalog management.
- [ ] Add edit/archive support for existing video records.
- [ ] Add explicit archive/publication controls where deletion is not appropriate.
- [ ] Add association/source review workflow.
- [ ] Add append-only moderation history only if latest-decision audit fields become insufficient.

---

# Production and Operations

## Current Production Setup

- [x] Ubuntu 24.04 VPS.
- [x] Node.js 24 + pnpm 11.
- [x] PostgreSQL 17 production cluster on port 5432.
- [x] `hotel-yab-api.service` and `hotel-yab-web.service` enabled through systemd.
- [x] Nginx public reverse proxy.
- [x] UFW enabled; 3000/4000/5432 are not intended as public ports.
- [x] Daily PostgreSQL backup timer at 03:00 UTC.
- [x] Current media provisioned to the VPS filesystem outside Git.
- [ ] Domain and HTTPS.
- [ ] Off-server backup copy.
- [ ] Monitoring/alerting/log aggregation.
- [ ] Automated deployment/CI-CD after the manual deploy workflow is stable.
- [ ] Schedule follower refresh in production when the desired cadence is decided.
- [ ] Decide when to migrate content media to object storage/CDN.
- [ ] Remove the old stopped PostgreSQL 16 cluster only after the production setup has remained stable long enough.

---

# Technical Improvements

- [ ] Improve API validation/error handling where real production failures show gaps.
- [ ] Add/expand automated tests around production-critical auth/admin flows.
- [ ] Review indexes and query performance as data grows.
- [ ] Add observability before broader public traffic.
- [ ] Review SEO/performance/security before a public launch campaign.

---

# Documentation

- [x] `ARCHITECTURE.md`
- [x] `DECISIONS.md`
- [x] `API.md`
- [x] `DATABASE.md`
- [x] `DATA_POLICY.md`
- [x] `CHANGELOG.md`
- [x] `TODO.md`
- [x] Refresh the documentation after the first production deployment and first reviewed Instagram batch apply.
- [ ] Keep the server/deployment runbook current after domain, SMS, and auth-session fixes.
- [ ] Review `README.md` later and remove duplicated operational detail.

---

# Suggested Execution Order

```text
1. Fix production auth/session refresh behavior
2. Document and practice the repeatable server update workflow
3. Domain + HTTPS + canonical production origin
4. Production SMS
5. Crawler automation + more reviewed video/data ingestion
6. Data enrichment + visible media bugs
7. Hotel/Person product refinements
8. Admin user/role-management improvements
9. Off-server backup + monitoring + CI/CD
```

---

# TODO Rules

- Only open or actively tracked work belongs in this file.
- Completed meaningful work should move to `CHANGELOG.md`.
- Technical decisions belong in `DECISIONS.md`.
- Database changes belong in `DATABASE.md`.
- API contract changes belong in `API.md`.
- Data-policy changes belong in `DATA_POLICY.md`.
