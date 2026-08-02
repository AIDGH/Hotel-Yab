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
- follower counts stored as display text such as `294K` and `6.5M`;
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

A relationship can only become `VERIFIED` after it has at least one reviewed
evidence source and a verification timestamp. `REJECTED` relationships and
verified relationships without evidence are not returned by the public API.

The conversion should preserve the original Instagram ID and source URL, use a
normalized lowercase value for stable matching, and never infer a precise
association type such as `STAYED` when the evidence only proves a visit or
event appearance.
