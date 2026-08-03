# Hotel-Yab Data Workbook Guide

The private workbook is stored at `data/Hotel-Yab_Data_Workbook.xlsx`. It is
the structured working format for hotels, notable people, relationships, and
evidence. The `data/` directory is excluded from Git.

## Sheets

### Hotels

One row represents one hotel. `slug`, `name`, `countryCode`, `city`, and
`publicationStatus` are required. Keep each `slug` stable after it has been
used by an association.

Use `imageUrl` for a stable, absolute `http` or `https` image URL. Do not use a
temporary Instagram CDN URL.

### People

One row represents one notable person. `slug`, `displayName`,
`primaryCategory`, and `publicationStatus` are required. A person can exist
before a hotel relationship is known.

Keep `displayName` for the real public name and `instagramHandle` for the
optional Instagram username without the `@` prefix. Do not derive the handle
from `slug`; the slug is only Hotel-Yab's stable URL identifier.

### Associations

One row represents one hotel-person relationship. `hotelSlug` and
`notablePersonSlug` must match existing rows in the other sheets.

Keep the relationship as `PENDING` while its evidence is incomplete. Use
`OTHER` when the exact relationship type is not proven. Change it to
`VERIFIED` only after a reviewed source exists and `verifiedAt` is filled.

### Sources

One row represents one evidence link attached to a relationship through
`associationReferenceKey`. Repeat a source row when the same URL supports more
than one relationship. Set only one source per relationship as `isPrimary`.

`evidenceNote` should state what the source actually proves, without making a
stronger claim than the content supports.

## Editing Rules

1. Add new records on a new row inside the existing Excel table.
2. Never identify relationships by cell color.
3. Do not change an existing slug or reference key casually.
4. Use the dropdowns for enum fields instead of typing new values.
5. Leave unknown optional cells empty; do not add placeholder URLs.
6. Keep follower counts in descriptive text only; they are not verification
   evidence.

The workbook does not yet sync to PostgreSQL automatically. A reusable
workbook-to-import converter is the next data-pipeline step. Until that exists,
the workbook must be converted and validated before running
`pnpm api:data:import`.
