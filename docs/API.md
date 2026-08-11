# Hotel-Yab API

## Overview

Hotel-Yab exposes application data through a backend HTTP API.

The frontend communicates with the API through functions such as:

```text
getHotels(...)
getNotablePeople(...)
```

Local development API:

```text
http://localhost:4000
```

The frontend must not access PostgreSQL directly.

All paths below are relative to `/api/v1`. Browser requests use the same-origin
`/api/v1` path with `credentials: include`; Next.js proxies them to the internal
API configured by `API_BASE_URL`. `NEXT_PUBLIC_API_BASE_URL` may override this
only when a deliberately separate public API origin is required.

---

# Hotels

## GET /hotels

Returns a paginated list of published hotels.

### Query Parameters

| Parameter     | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| `query`       | string | Search by hotel name or related text |
| `city`        | string | Filter by city                       |
| `countryCode` | string | Filter by country code               |
| `sort`        | enum   | `NAME_ASC` (default) or `CITY_ASC`   |
| `page`        | number | Page number                          |
| `pageSize`    | number | Number of results per page           |

Example:

```text
GET /hotels?city=تهران&page=2&pageSize=24
```

### Response Structure

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "pageSize": 24,
    "totalPages": 1
  }
}
```

Hotel list items may include fields such as:

```text
id
slug
name
city
imageUrl
logoUrl
starRating
associationCount
verifiedAssociationCount
```

Only publicly displayable hotels should be returned.

---

# Notable People

## GET /notable-people

Returns a paginated list of published notable people.

### Query Parameters

| Parameter     | Type   | Description                                                   |
| ------------- | ------ | ------------------------------------------------------------- |
| `query`       | string | Search by person name                                         |
| `category`    | string | Filter by primary category                                    |
| `countryCode` | string | Filter by country code                                        |
| `sort`        | enum   | `FOLLOWERS_DESC` (default), `NAME_ASC`, or `HOTEL_COUNT_DESC` |
| `page`        | number | Page number                                                   |
| `pageSize`    | number | Number of results per page                                    |

Example:

```text
GET /notable-people?category=ACTOR&page=2&pageSize=24
```

### Response Structure

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "pageSize": 24,
    "totalPages": 1
  }
}
```

Person data may include fields such as:

```text
id
slug
displayName
primaryCategory
occupation
followerCount
biography
imageUrl
instagramHandle
publicationStatus
associationCount
verifiedAssociationCount
```

Only records allowed by publication rules should be returned.

### Exact Instagram Username Resolution

Travel-video composition reuses this list endpoint with `query` and then
matches `instagramHandle` exactly after removing an optional leading `@` and
normalizing case. No person profile fields are copied into the Video record.

Example:

```text
GET /notable-people?query=morteza.kowsari&pageSize=100
```

---

# Destinations and Travel Videos

## GET /destinations

Returns all published city/province records from PostgreSQL, including parent
province metadata, display order, and media paths.

## GET /destinations/:type/:slug

Returns one published destination. `type` is `cities` or `provinces`.

## GET /travel-videos

Returns published canonical videos with `sourceUrl`, media/thumbnail paths,
destination records, and optional linked hotels. Person profile data remains
resolved by exact normalized Instagram username.

---

# Authentication and Profile

The public discovery experience does not require an account. Authentication is
required only for account-specific reads and writes.

## POST /auth/login/password

The default login path accepts either the normalized/mobile input or a site
username:

```json
{ "identifier": "arad.example", "password": "a-long-password" }
```

Passwords are never stored or returned in plaintext. The server verifies the
salted `scrypt` hash and creates an opaque HttpOnly-cookie session.

New-password forms validate the 8–72 character lowercase/uppercase/digit/symbol
rule before making a request and render the failure as Persian red inline
feedback. Native browser validation bubbles are disabled for these account
forms; the API remains the authoritative validation boundary.

## POST /auth/login/otp/request

```json
{ "identifier": "09123456789" }
```

This is the passwordless/fallback path for an existing account. `identifier`
may be the user's mobile or username. The response contains the normalized
destination mobile, expiry, resend timing, and non-production-only
`developmentCode`. Production must deliver the code through an SMS provider.
The default resend cooldown is 60 seconds and the client must use the returned
`resendAfterSeconds` rather than starting an unrelated timer.

## POST /auth/login/otp/verify

```json
{ "identifier": "arad.example", "code": "123456" }
```

Successful verification logs in the existing user and sets the opaque
`hotel_yab_session` HttpOnly cookie. It does not auto-create an account.

## POST /auth/register/otp/request

```json
{
  "mobile": "09123456789",
  "username": "arad.example",
  "password": "Arad@2026pass"
}
```

Validates the complete registration draft before sending an OTP. It rejects
invalid fields and any existing mobile, username, email, or Instagram handle on
the registration request itself, so known conflicts are not deferred to the code
verification step. The final registration endpoint repeats uniqueness checks
to protect against races.

The website registration form accepts an 11-digit Iranian mobile beginning
with `09`. New passwords require 8–72 characters with at least one lowercase
ASCII letter, one uppercase ASCII letter, one digit, and one non-alphanumeric
symbol. Name, family name, email, Instagram, and avatar are completed later
from `/account` to reduce signup friction.

## POST /auth/register

```json
{
  "mobile": "09123456789",
  "code": "123456",
  "username": "arad.example",
  "password": "Arad@2026pass"
}
```

Registration consumes the mobile OTP, requires a unique normalized username,
and creates the first session. Mobile, username, email (when present), and
Instagram handle (when present) are uniqueness-protected. Legacy OTP-created
accounts may temporarily lack username/password and are prompted to complete
them after OTP login.

## GET /auth/me

Returns the authenticated user, including optional profile fields and an
admin-verified notable-person link when present. The response includes
`username`, `hasPassword`, `profileComplete`, and nullable `avatarUrl`, but never `passwordHash`.
Returns `401` without a valid session.

## PATCH /auth/me/profile

Authenticated request. All fields are optional at the API boundary:

```json
{
  "firstName": "آراد",
  "lastName": "نمونه",
  "username": "arad.example",
  "password": "an-optional-new-password",
  "email": "arad@example.com",
  "instagramHandle": "arad.example"
}
```

Empty name, family-name, `email`, or `instagramHandle` values clear those
optional fields. Username and Instagram uniqueness are enforced. An optional
password value replaces the stored salted hash. Users
cannot link themselves to a `NotablePerson`; that relation is verified and set
administratively.

## GET /auth/me/avatar

Authenticated binary response for the current user's avatar. Returns `404` if
the account has no avatar. The `avatarUrl` returned by account responses points
to this endpoint with an update-version query parameter.

## POST /auth/me/avatar

Authenticated `multipart/form-data` upload using the `avatar` field. Accepted
formats are JPEG, PNG, and WebP; declared MIME type and file signature must
match, and the maximum size is 1 MB. Returns the updated public account object.

## DELETE /auth/me/avatar

Deletes the current user's avatar and returns the updated public account object.

## POST /auth/logout

Deletes the current server-side session and clears the session cookie.

---

# Account Activity

## GET /account/activity

Authenticated request returning the current user's own hotel reviews and video
comments. Each item includes its moderation status and timestamps. Hotel-review
items include the canonical hotel slug/name/city; video-comment items include
the canonical video ID and direct-reply count. Results are ordered newest first
and currently capped at 50 reviews and 100 comments.

This private endpoint may include the owner's `PENDING`, `PUBLISHED`, `REJECTED`,
or `HIDDEN` items, but it never exposes internal `moderationNote` values.

## DELETE /account/activity/video-comments/:id

Deletes a video comment owned by the authenticated user. A comment with one or
more replies cannot be deleted and returns `409 Conflict`, preserving other
users' replies. Missing or non-owned comments return `404`.

Hotel reviews continue to be deleted through
`DELETE /hotels/:slug/reviews/me`; the account page reuses that endpoint rather
than introducing a duplicate review-deletion contract.

---

# Account Library

All account-library endpoints require a valid session. Likes and saves are
separate private states; changing one never changes the other.

## GET /account/library

Returns the current user's four collections in one response:

```json
{
  "likedHotels": [],
  "savedHotels": [],
  "likedNotablePeople": [],
  "savedNotablePeople": []
}
```

Items contain only the minimal catalog metadata needed for controls and the
private library UI. Targets that are no longer published are excluded.

## PUT/DELETE /account/library/hotels/:slug/like

Adds or removes the current user's hotel like. `PUT` is idempotent.

## PUT/DELETE /account/library/hotels/:slug/save

Adds or removes the current user's saved-hotel state. `PUT` is idempotent.

## PUT/DELETE /account/library/notable-people/:slug/like

Adds or removes the current user's notable-person like. `PUT` is idempotent.

## PUT/DELETE /account/library/notable-people/:slug/save

Adds or removes the current user's saved-notable-person state. `PUT` is
idempotent. All four mutation routes return `404` for missing or unpublished
targets and `401` without a valid session.

---

# Hotel Reviews

## GET /hotels/:slug/reviews

Returns published reviews plus aggregate `averageRating` and `reviewCount`.

## GET /hotels/:slug/reviews/me

Authenticated request returning the current user's review for the hotel,
including its moderation status.

## PUT /hotels/:slug/reviews/me

Creates or updates the current user's single review for the hotel.

```json
{ "rating": 4, "body": "تجربه خوبی بود." }
```

`rating` must be 1–5. Review text is optional; when present it must contain 3–2000
characters. New and edited reviews are stored as `PENDING` and are not included
in the public list until moderation publishes them. The frontend performs the
same minimum check and renders a Persian red inline error rather than relying on
the browser's native validation bubble.

## DELETE /hotels/:slug/reviews/me

Deletes the current user's review for that hotel.

---

# Video Comments

## GET /videos/:videoId/comments

Returns only published comments for the canonical video. Replies are nested one
level deep.

## GET /videos/:videoId/comments/count

Returns the public comment count without loading the comment body list. This is
used by the collapsed comment control.

## POST /videos/:videoId/comments

Authenticated request. Completing first and last name is optional:

```json
{ "body": "ویدیوی مفیدی بود.", "parentId": null }
```

`parentId` is optional and supports one reply level. The API allows at most five
comment submissions per user in a rolling 60-second window. New users and
comments containing a link, exact recent repetition, or a baseline risky term
start as `PENDING`. A clean comment from a user with at least two published
comments starts as `PUBLISHED`. The response returns the resulting status so the
UI can distinguish immediate publication from a moderation queue. When profile
names are still empty, the public author label is `کاربر هتل‌یاب`.

The relationship is always User → VideoComment → Video; it does not depend on
which destination or person page rendered the video.

## POST /videos/:videoId/comments/:commentId/reports

Authenticated request for reporting another user's published comment:

```json
{ "reason": "SPAM", "details": "پیام تکراری است." }
```

Supported reasons are `SPAM`, `HARASSMENT`, `HATEFUL`, `MISINFORMATION`, and
`OTHER`. A user cannot report their own comment or report the same comment more
than once. At three unresolved unique reports, the comment is automatically
hidden. The response includes the current report count and whether auto-hide
occurred.

---

# Admin Moderation

All moderation endpoints require an authenticated `ADMIN` or `MODERATOR`.

## GET /admin/moderation/queue

```text
GET /admin/moderation/queue?status=PENDING
```

Returns hotel reviews and video comments for one moderation status, plus a
separate `reportedComments` collection for unresolved reports. The default is
`PENDING`; supported status values are `PENDING`, `PUBLISHED`, `REJECTED`, and
`HIDDEN`. Reported items include the unique report count and report reasons,
while private account contact data remains excluded.

## PATCH /admin/moderation/hotel-reviews/:id

## PATCH /admin/moderation/video-comments/:id

```json
{ "status": "PUBLISHED", "moderationNote": "Source checked" }
```

The decision records moderator identity, decision time, and an optional private
note. Publishing sets `publishedAt`; other states clear it. Resolving a reported
comment to a non-`PENDING` status also resolves its open reports.

## DELETE /admin/moderation/hotel-reviews/:id

## DELETE /admin/moderation/video-comments/:id

Administrator-only permanent deletion endpoints. They return
`{ "data": { "success": true } }`; a missing item returns `404`. Deleting a
parent video comment also removes its replies through the database relation.
Moderators may change moderation status but cannot use these deletion routes.

## PATCH /admin/moderation/users/:id/status

Administrator-only endpoint:

```json
{ "status": "BLOCKED" }
```

Supported values are `ACTIVE` and `BLOCKED`. Blocking immediately revokes all
sessions for the target user. Administrators cannot block their own account.

---

# Admin Catalog

All catalog endpoints require an authenticated `ADMIN`; `MODERATOR` access is
not sufficient.

## GET /admin/catalog/bootstrap

Returns compact destination, hotel, person, and video records for the forms and
relationship selectors.

## POST /admin/catalog/destinations

Creates a city or province. Cities require a valid parent-province ID.

## POST /admin/catalog/hotels

Creates a Hotel using the same field concepts as the import dataset, including
optional local or remote image/logo paths.

## POST /admin/catalog/notable-people

Creates a NotablePerson after slug and normalized Instagram duplicate checks.

## POST /admin/catalog/videos

Creates a complete Video, at least one `VideoDestination`, and optional
`VideoHotel` links in one transaction. The Instagram username must resolve to
an existing notable person and the original public `sourceUrl` is required.

## GET /admin/catalog/export

Returns a JSON snapshot containing `hotels`, `notablePeople`, `sources`,
`associations`, `destinations`, and enriched `videos` in the extended validated
import shape.

---

# Pagination

List endpoints use the same pagination model.

Example:

```json
{
  "meta": {
    "total": 125,
    "page": 2,
    "pageSize": 24,
    "totalPages": 6
  }
}
```

Frontend pagination should preserve active filters when moving between pages.

---

# Error Handling

The API should return appropriate HTTP status codes.

Typical cases:

```text
200 → Successful request
201 → Resource created
400 → Invalid request or parameters
401 → Missing or invalid session / invalid verification
409 → Unique-field conflict such as an email already in use
429 → OTP requested again before the resend window
404 → Resource not found
500 → Internal server error
```

The frontend should handle API failures without breaking the page structure.

---

# Publication Rules

The API acts as a boundary between stored data and public data.

Conceptually:

```text
PostgreSQL
    ↓
Backend API
    ↓
Publication Rules
    ↓
Public Frontend
```

The existence of a record in PostgreSQL does not automatically make it publicly accessible.

Detailed verification and publication rules are documented in:

```text
docs/DATA_POLICY.md
```

---

# Detail Endpoints

The API supports:

```text
GET /hotels/:slug

GET /notable-people/:slug
```

These endpoints return:

### Hotel Detail

- hotel information;
- media;
- nullable `starRating` for the hotel's official 1–5 classification;
- documented notable-person associations;
- verified relationship information.
- `ratingSummary` containing the user-review average and count of published
  reviews. It is independent from `starRating`.

### Notable Person Detail

- profile information;
- occupation;
- biography;
- Instagram;
- media;
- associated hotels.

Both endpoints apply the same publication and association-visibility rules as
the list endpoints.

---

# API Principles

1. The frontend communicates with application data only through the API.
2. Prisma and PostgreSQL remain backend concerns.
3. List endpoints support pagination.
4. Search and filters are passed as query parameters.
5. Public endpoints respect publication rules.
6. API responses should remain predictable and typed.
7. Sorting is applied before pagination so page boundaries remain stable.
