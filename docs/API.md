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

---

# Hotels

## GET /hotels

Returns a paginated list of published hotels.

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `query` | string | Search by hotel name or related text |
| `city` | string | Filter by city |
| `page` | number | Page number |
| `pageSize` | number | Number of results per page |

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
associationCount
verifiedAssociationCount
```

Only publicly displayable hotels should be returned.

---

# Notable People

## GET /notable-people

Returns a paginated list of published notable people.

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `query` | string | Search by person name |
| `category` | string | Filter by primary category |
| `page` | number | Page number |
| `pageSize` | number | Number of results per page |

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
biography
imageUrl
instagramHandle
publicationStatus
```

Only records allowed by publication rules should be returned.

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
400 → Invalid request or parameters
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

# Planned Detail Endpoints

As hotel and notable-person detail pages are expanded, the API is expected to support operations such as:

```text
GET /hotels/:slug

GET /notable-people/:slug
```

These endpoints may return:

### Hotel Detail

- hotel information;
- media;
- documented notable-person associations;
- verified relationship information.

### Notable Person Detail

- profile information;
- occupation;
- biography;
- Instagram;
- media;
- associated hotels.

These endpoints should only be documented as active once implemented.

---

# API Principles

1. The frontend communicates with application data only through the API.
2. Prisma and PostgreSQL remain backend concerns.
3. List endpoints support pagination.
4. Search and filters are passed as query parameters.
5. Public endpoints respect publication rules.
6. API responses should remain predictable and typed.
7. Planned endpoints must not be treated as implemented until they exist in the codebase.