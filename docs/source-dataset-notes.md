# Source Dataset Notes

These notes describe the initial private research files under `data/`. The
files themselves are intentionally excluded from Git because they are evolving
working data and may contain claims that have not yet been verified.

## Files Reviewed

- `Influencer_Hotel_Tracker.xlsx`
- `Influencer_Hotel_Tracker.pdf`

The Excel workbook is the structured source. The PDF is useful for visually
checking colors and layout, but it should not be parsed as the canonical data
source.

## Workbook Layout

The workbook currently has one worksheet named `دیتای هتل‌ها و شهرها` with
four logical tables:

| Range | Purpose |
| --- | --- |
| `A:M` | Hotels and up to five highlighted people per hotel |
| `N:O` | Trip influencers |
| `P:Q` | Adventure influencers |
| `R:T` | Other influencers, actors, artists, and available source links |
| `U` | City reference list |

The first table stores city, hotel name, hotel Instagram ID, and five pairs of
person ID and follower count. The longer person tables use cell colors to show
additional hotel associations that do not fit in the five highlighted columns.

## Important Conversion Rules

Cell color is a presentation convention, not a stable relationship identifier.
Before import, every color-based match must be converted into an explicit
hotel-person relationship and reviewed by a human.

The initial files contain several data-quality cases that normalization must
handle:

- mixed casing in Instagram IDs;
- leading or trailing whitespace;
- Persian display names where an Instagram ID is unavailable;
- follower counts stored as display text such as `294K` and `6.5M`, which are
  normalized into integer `followerCount` values during conversion;
- formulas that depend on cached Excel values;
- duplicate people across hotel/color groups;
- missing evidence URLs for most relationships.

At least three Instagram post URLs are currently present in column `T`. These
can become `Source` records with type `SOCIAL_MEDIA_POST` or `VIDEO`, depending
on the actual content. The URL remains the canonical evidence link.

## Current Preview Import Policy

The current local preview imports 15 hotels, 157 people, 152 relationships, and
3 source URLs. Hotels and people are `PUBLISHED` so their pages can be reviewed
in the product. Every spreadsheet-derived relationship remains `PENDING` and is
visibly labeled as incomplete. Missing media is represented by an empty UI
placeholder, never by a fabricated URL.

Follower text has been removed from `occupation`. People without a known count
remain in the dataset with `followerCount = null`; the conversion must never
drop those records.

A relationship can only become `VERIFIED` after it has at least one reviewed
evidence source and a verification timestamp. `REJECTED` relationships and
verified relationships without evidence are not returned by the public API.

The conversion should preserve the original Instagram ID and source URL, use a
normalized lowercase value for stable matching, and never infer a precise
association type such as `STAYED` when the evidence only proves a visit or
event appearance.

## Runtime Follow-up — 2026-08-16

The counts above describe the initial preview import and are retained as
historical source-dataset notes. They should not be silently rewritten to match
later runtime counts.

The current PostgreSQL/Admin Catalog notable-person set exposed to the follower
tracker contained 149 people during the first complete refresh on 2026-08-16.
After correcting two invalid Instagram handles, the browser-based collector
successfully refreshed all 149 current records. This runtime count does not
invalidate the earlier 157-person preview count; the two numbers refer to
different stages of the project dataset.

Follower values are now maintained as time-sensitive runtime metadata:
`NotablePerson.followerCount` stores the latest successful value,
`followersUpdatedAt` stores the capture time, and `FollowerSnapshot` stores one
daily historical observation.

## Current Instagram Travel Research Tooling

Instagram candidate discovery now uses `tools/instagram-travel-finder/` rather
than relying only on the original workbook. The crawler keeps local
checkpoint/JSON output, the detector favors high recall and explicitly
prioritizes HOTEL signals, and `json_to_excel.py` creates a human-review XLSX.
Only rows explicitly marked `approved` are eligible for the importer.

The importer now provides both dry-run validation and explicit approved-row
apply through the protected Admin Catalog API. It resolves people, destinations,
hotels, and duplicate `sourceUrl` values against canonical data; missing named
destinations/hotels still block the row rather than being guessed. The first
reviewed production batch successfully applied 32 approved travel/hotel videos.


## Production Runtime Follow-up - 2026-08-18

The first VPS production bootstrap restored the current canonical application
data after Prisma migrations were deployed. The deployment snapshot contained
18 hotels, 157 notable people, 35 destinations, and 38 videos. These are runtime
counts for that production snapshot and should not overwrite the historical
preview/import counts documented above.

Content media was provisioned separately from Git. Production records that still
contained `http://localhost:3000/...` media references were normalized to stable
relative paths before public serving.
