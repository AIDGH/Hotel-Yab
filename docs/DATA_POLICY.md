# Hotel-Yab Data Policy

## Overview

This document defines how Hotel-Yab collects, verifies, stores, and publishes data.

The main principle is:

> Data may be stored before it is ready to be publicly displayed.

---

## Data Types

Hotel-Yab currently works with:

- Hotels
- Notable people
- Hotel–person associations
- Images
- Instagram information
- Biography and occupation
- Follower-count snapshots
- External sources and evidence

---

## Data Sources

Data should come from sources that are publicly accessible.

Examples:

- official hotel websites;
- official hotel social-media pages;
- official or verified notable-person pages;
- public posts and videos;
- public news articles;
- reputable media sources;
- other publicly accessible references.

Private or unauthorized data should not be used.

---

## Association Verification

A hotel–person association should only be published when there is reasonable evidence supporting the relationship.

Examples of acceptable evidence:

- a public post showing the person at the hotel;
- an official hotel post mentioning the person;
- a public video;
- a reputable article;
- another verifiable public source.

The association record should preserve its source whenever possible.

---

## Verification Principle

Conceptually:

```text
Collected Data
      ↓
Source Review
      ↓
Structured Record
      ↓
Verification
      ↓
Publication
```

A record should not automatically become public simply because it exists in the database.

---

## Publication Status

Records may exist in different publication states.

Conceptually:

```text
Draft / Incomplete
        ↓
Reviewed
        ↓
Published
```

Only records that satisfy the current publication requirements should appear on public pages.

---

## Hotels

A hotel should have enough reliable information to be useful before publication.

Important information may include:

- name;
- slug;
- city;
- image;
- basic hotel information;
- at least one useful public reference when necessary.

Incomplete hotel records may remain stored without being publicly visible.

---

## Notable People

Notable-person records may include:

- display name;
- slug;
- primary category;
- occupation;
- biography;
- image;
- Instagram handle.
- follower count snapshot.

Information should be based on publicly available and reasonably reliable sources.

Primary categories should remain broad.

More specific professional information belongs in `occupation`.

---

## Images

Images should come from publicly accessible sources or sources that Hotel-Yab is permitted to use.

The database should normally store an image reference or URL rather than the original binary data.

Images should:

- represent the correct hotel or person;
- avoid obvious duplicates;
- avoid misleading or unrelated content;
- be replaced if a more reliable or higher-quality image becomes available.

For locally stored third-party media, the author, source URL, license, and any
format conversion must be recorded in `docs/MEDIA_ATTRIBUTIONS.md`. A public
webpage is not by itself permission to reuse an image.

---

## Instagram Data

Instagram information may include:

- public username;
- public profile link;
- publicly visible follower information.

Only publicly available information should be collected.

Instagram handles should be verified when possible to reduce incorrect profile matching.

`followerCount` is stored as a non-negative integer when known and remains
separate from `occupation`. It is an approximate, time-sensitive snapshot used
for display and sorting, not evidence for a hotel-person association. Unknown
counts stay `null` rather than being guessed.

## Travel Videos

Travel videos must retain `sourceUrl` for the original public post. A video is
connected to a person only when `instagramUsername` exactly matches the
normalized published `instagramHandle`; similar display names are not enough.

Destination relationships use destination type and slug. One video may belong
to multiple destinations, and destination/person metadata must be resolved
from their canonical records rather than copied into the video dataset.

---

## Biography and Occupation

Biographies should be concise and factual.

Avoid:

- unsupported claims;
- unnecessary personal details;
- speculation;
- promotional language.

Occupation should describe the person's professional role more specifically than the broad primary category.

Example:

```text
primaryCategory: ACTOR
occupation: بازیگر و تهیه‌کننده
```

---

## Sources

Whenever practical, important facts and hotel–person associations should retain their supporting source.

A source may contain:

- URL;
- platform;
- source type;
- date;
- notes;
- verification status.

Future database models may formalize these fields further.

---

## Conflicting Information

When sources disagree:

1. prefer primary or official sources;
2. prefer newer reliable information when the fact may change over time;
3. do not silently choose uncertain information;
4. keep the record unpublished if confidence is insufficient.

---

## Missing Information

Missing data should remain missing rather than being guessed.

For example:

```text
instagramHandle = null
```

is preferable to storing an unverified Instagram account.

The same principle applies to:

- images;
- occupation;
- biography;
- hotel information;
- associations.

---

## Data Updates

Information may change over time.

Examples include:

- Instagram usernames;
- follower counts;
- hotel information;
- websites;
- publication status.

When updated information is found, the structured dataset and database should be updated rather than creating unnecessary duplicate records.

---

## Duplicate Prevention

Before creating a new Hotel or Notable Person, existing records should be checked.

Useful identifiers include:

- slug;
- normalized name;
- Instagram handle;
- existing external identifiers.

Duplicate associations between the same hotel and person should also be avoided.

---

## Research Spreadsheet

The research spreadsheet is a working data source, not the final public database.

Future intended flow:

```text
Research Spreadsheet
        ↓
Cleaning / Normalization
        ↓
Validation
        ↓
Sync Script
        ↓
PostgreSQL
        ↓
Publication Rules
        ↓
Website
```

Raw spreadsheet data should not bypass validation and be published directly.

---

## User-Submitted Data

Hotel-Yab accepts hotel reviews and video comments from authenticated users.
Submissions do not become public automatically.

Current flow:

```text
User Submission
      ↓
PENDING moderation
      ↓
PUBLISHED / REJECTED / HIDDEN
      ↓
Public API (published only)
```

- Mobile numbers and email addresses are private account data and must never be
  included in public review/comment responses. Passwords are never retained in
  plaintext or exposed by any API; only salted hashes are stored.
- Site usernames and optional Instagram handles are normalized and uniqueness
  protected. Instagram uniqueness still does not prove notable-person identity.
- Public contributions use the user's display name only.
- Instagram handle is optional and does not prove that a user is a notable
  person. Linking a user to `NotablePerson` requires administrative review.
- Follower count is not requested from users; notable-person follower data
  remains a separately maintained snapshot.
- Editing a review returns it to `PENDING` so previously approved text cannot be
  replaced without review.
- The same moderation rule applies to comments and replies.
- The latest moderation action records the responsible manager/moderator,
  timestamp, and an internal note; these audit fields are not public content.

---

## Core Data Principles

1. Use publicly accessible information.
2. Do not publish unsupported hotel–person relationships.
3. Preserve sources whenever possible.
4. Missing information should not be guessed.
5. Stored data and published data are separate concepts.
6. Prefer reliable and primary sources.
7. Resolve duplicates before creating new records.
8. Conflicting information should be reviewed rather than silently overwritten.
9. Raw research data should pass through validation before publication.
10. Data quality is more important than maximizing the number of records.
