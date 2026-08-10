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

All paths below are relative to `/api/v1`. Browser session requests use
`credentials: include`; the API permits credentialed CORS only from the
configured frontend origin.

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
normalizing case. No person fields are copied into `travel-videos.json`.

Example:

```text
GET /notable-people?query=morteza.kowsari&pageSize=100
```

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

## POST /auth/login/otp/request

```json
{ "identifier": "09123456789" }
```

This is the passwordless/fallback path for an existing account. `identifier`
may be the user's mobile or username. The response contains the normalized
destination mobile, expiry, resend timing, and non-production-only
`developmentCode`. Production must deliver the code through an SMS provider.

## POST /auth/login/otp/verify

```json
{ "identifier": "arad.example", "code": "123456" }
```

Successful verification logs in the existing user and sets the opaque
`hotel_yab_session` HttpOnly cookie. It does not auto-create an account.

## POST /auth/register/otp/request

```json
{ "mobile": "09123456789" }
```

Requests mobile verification for a new account and rejects a mobile already
attached to a user.

## POST /auth/register

```json
{
  "mobile": "09123456789",
  "code": "123456",
  "username": "arad.example",
  "password": "a-long-password",
  "firstName": "آراد",
  "lastName": "نمونه",
  "email": "arad@example.com",
  "instagramHandle": "arad.example"
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
`username`, `hasPassword`, and `profileComplete`, but never `passwordHash`.
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

Empty `email` or `instagramHandle` values clear those optional fields. Username
and Instagram uniqueness are enforced. An optional password value replaces the
stored salted hash. Users
cannot link themselves to a `NotablePerson`; that relation is verified and set
administratively.

## POST /auth/logout

Deletes the current server-side session and clears the session cookie.

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

`rating` must be 1–5. New and edited reviews are stored as `PENDING` and are not
included in the public list until moderation publishes them.

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

Authenticated request requiring a completed first and last name:

```json
{ "body": "ویدیوی مفیدی بود.", "parentId": null }
```

`parentId` is optional and supports one reply level. New comments are `PENDING`
until moderation. The relationship is always User → VideoComment → Video; it
does not depend on which destination or person page rendered the video.

---

# Admin Moderation

All moderation endpoints require an authenticated `ADMIN` or `MODERATOR`.

## GET /admin/moderation/queue

```text
GET /admin/moderation/queue?status=PENDING
```

Returns hotel reviews and video comments for one moderation status. The default
is `PENDING`; supported values are `PENDING`, `PUBLISHED`, `REJECTED`, and
`HIDDEN`.

## PATCH /admin/moderation/hotel-reviews/:id

## PATCH /admin/moderation/video-comments/:id

```json
{ "status": "PUBLISHED", "moderationNote": "Source checked" }
```

The decision records moderator identity, decision time, and an optional private
note. Publishing sets `publishedAt`; other states clear it.

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
- documented notable-person associations;
- verified relationship information.
- `ratingSummary` containing the average and count of published reviews.

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
