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

Use `logoUrl` only for an optional hotel logo, separate from the main hotel
image. Local logo filenames follow `<hotel-slug>-logo.webp`.

Use `starRating` only for a reviewed official hotel classification from 1 to 5.
Leave it empty when the classification is unknown; never infer it from user
reviews or amenities.

### People

One row represents one notable person. `slug`, `displayName`,
`primaryCategory`, and `publicationStatus` are required. A person can exist
before a hotel relationship is known.

Keep `displayName` for the real public name and `instagramHandle` for the
optional Instagram username without the `@` prefix. Do not derive the handle
from `slug`; the slug is only Hotel-Yab's stable URL identifier.

Keep `occupation` limited to the person's professional role. `followerCount`
may still be present in the workbook as seed/research data, but runtime follower
maintenance is now handled by the Instagram follower tracker. Leave workbook
counts empty when unknown rather than guessing them; do not manually maintain
the workbook as a daily follower-history source.

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
6. Normalize display counts such as `294K` or `6.5M` into numeric
   `followerCount`; follower counts are not verification evidence.

The workbook does not yet sync to PostgreSQL automatically. A reusable
workbook-to-import converter is the next data-pipeline step. Until that exists,
the workbook must be converted and validated before running
`pnpm api:data:import`.

## Destination and Travel Content Workbook

The private `../Data/HotelYab_Destinations_Data.xlsx` workbook remains a bulk
research source. Runtime destination/video data now lives in PostgreSQL. It has
three sheets:

- `Destinations`: one city or province per row;
- `TravelVideos`: one canonical Instagram content aggregate per row;
- `VideoDestinations`: one content-to-city/province link per row, so one content
  record may have multiple destination rows.

The current workbook is still optimized for single videos. Multi-image posts and
multi-video stories should be created through `/admin/catalog` or represented in
the JSON import with `contentKind` plus ordered `mediaItems`; do not create one
canonical row per slide.

Destination images are not workbook fields. Derive them from the normalized
slug:

```text
PROVINCE → /images/provinces/<slug>.webp
CITY     → /images/cities/<slug>.webp
```

`display_order` is scoped by destination type: city order 1 and province order
1 are both valid. `parent_province_slug` must contain the province slug, such as
`hormozgan`, not the Persian label `هرمزگان`.

For routine additions, use `/admin/catalog`:

1. For a single `VIDEO`, store media as
   `apps/web/public/travel-videos/<person-slug>/<sequence>.mp4` for `TRAVEL`, or
   `apps/web/public/hotel-videos/<person-slug>/<hotel-slug>-<sequence>.mp4` for
   single-hotel `HOTEL` media. Use `multi-hotel` instead of one hotel slug when
   a video belongs to several hotels; thumbnails use the same stem plus
   `-thumbnail.webp`. For `POST` or `STORY`, keep one content stem and append
   ordered `-01`, `-02`, ... suffixes to its items; either format may mix
   images and videos.
2. Add any missing destination or notable person first.
3. Choose `TRAVEL` or `HOTEL`, then `VIDEO`, `POST`, or `STORY`; choose
   image or video independently for every post/story item, add/reorder all
   media items, search and toggle related destinations/hotels, review the
   automatically suggested editable paths, and retain the original Instagram
   `sourceUrl`.
4. Use «دریافت خروجی JSON» when a complete import-compatible snapshot is
   needed; do not edit JSON and PostgreSQL independently.

The tracked transition JSON can still be imported idempotently with
`pnpm --filter @hotel-yab/api data:import-travel`. This is for migration or
recovery, not the routine add workflow. Future large batches should use a
dry-run converter/import report rather than returning to manual JSON editing.

## Instagram Travel Review Queue and Legacy Workbook

The current bulk Instagram discovery tooling lives under:

```text
tools/instagram-travel-finder/
```

The primary review flow is now:

```text
GraphQL crawler
    ↓
JSON + checkpoint
    ↓
candidate detector
    ↓
upload crawler JSON in `/admin/crawl-reviews`
    ↓
human review with canonical destination selectors
    ↓
download `<username>.reviewed.json`
    ↓
download_approved.py --dry-run
    ↓
download_approved.py --download --prepare-media
    ↓
import_approved.py --dry-run
    ↓
explicit reviewed apply
    ↓
Admin API / PostgreSQL
```

The reviewed JSON export can be passed directly to both approved-media scripts;
manual Excel generation is no longer required. The existing
`json_to_excel.py` and reviewed XLSX format remain supported for offline or
legacy batches.

### Generated Review Field Defaults

The JSON-to-XLSX converter fills several review fields with initial suggestions
to reduce manual review effort.

Generated fields:

- عنوان نهایی:
  Always generated in Persian.
  It is inferred from available caption text, creator information, and detected
  destination signals.

- نام مکان نهایی:
  Generated in Persian from detected destination entities.
  English Instagram/location labels should not be exported directly.

- نوع مکان:
  Suggested from caption keywords and detected hotel/travel signals.

- خلاصه کپشن:
  Generated from the original caption when available.

These values are suggestions only and must still be reviewed before import.

The generated review sheet uses human-readable Persian columns. The importer
resolves fields by header name rather than column position, so moving columns or
changing row colors does not change import semantics. The required review/import
headers are:

```text
اینستاگرام
لینک پست
وضعیت بررسی
هتل
شهر نهایی
استان نهایی
```

Important rules:

1. Only `approved` rows are eligible for database import.
2. `لینک پست` must be the original Instagram `/p/.../` or `/reel/.../` URL.
3. At least one final city or province is required.
4. Multiple final destinations are separated with ` | `.
5. A blank hotel is valid and means no `VideoHotel`; reviewed hotel content uses
   the hotel-video media root.
6. A named hotel or destination that cannot be resolved must block the row
   rather than be silently created.
7. Existing `sourceUrl` values are reported as already existing instead of
   creating duplicates.
8. Final content titles are checked against the catalog and the current approved
   batch. A repeated title is kept safe by receiving the first free numeric
   suffix, for example `سفر به گیلان 2`, then `سفر به گیلان 3`; no existing
   content is overwritten.
9. Running `json_to_excel.py` regenerates the workbook from JSON and can erase
   manual review edits, so reviewed XLSX files must be backed up before
   regeneration.
10. `tools/instagram-travel-finder/output/`, captured `query.json`, and
   `query.rtf` are local working artifacts and are not committed.

### Admin Review and Approved Media Commands

Use one profile name consistently through this four-step workflow. The following
example uses `morteza.kowsari`.

1. Crawl the profile and write/update its local JSON checkpoint output:

```bash
python3 tools/instagram-travel-finder/crawl_graphql.py morteza.kowsari
```

2. In `/admin/crawl-reviews`, upload
`tools/instagram-travel-finder/output/<username>.json`, review every row, and
download the reviewed JSON export. Save it locally as, for example,
`<username>.reviewed.json`.

For a legacy/offline run only, convert the candidate JSON into the merge-safe
review workbook instead:

```bash
python3 tools/instagram-travel-finder/json_to_excel.py morteza.kowsari
```

When using XLSX, pause for human review and back up the reviewed workbook before
continuing. In either format, only explicitly approved rows are imported.

3. With the API running, an admin cookie exported in the current shell, and an
authenticated `instagram.com` Chrome session, download approved media and
prepare the final `travel-videos`/`hotel-videos` public paths. Install the
browser-cookie reader once if needed:

```bash
python3 -m pip install browser-cookie3
export HOTELYAB_ADMIN_COOKIE='hotel_yab_session=PASTE_VALUE_HERE'
python3 tools/instagram-travel-finder/download_approved.py \
  /path/to/morteza.kowsari.reviewed.json \
  --download --prepare-media --load-cookies chrome
```

4. Validate the stable plan, then explicitly apply it to create the canonical
content/media items and person/hotel/destination relationships through the
Admin API:

```bash
python3 tools/instagram-travel-finder/import_approved.py \
  /path/to/morteza.kowsari.reviewed.json --dry-run
python3 tools/instagram-travel-finder/import_approved.py \
  /path/to/morteza.kowsari.reviewed.json --apply
unset HOTELYAB_ADMIN_COOKIE
```

Do not run `--apply` until dry-run completes without blocked or unresolved rows.
On macOS, allow the Keychain prompt if it appears. The imported browser session
is saved locally by Instaloader, so later downloads may reuse it with
`--login jaryan.hotelyab`.

### Direct Highlight Downloads

Direct Highlight links can be downloaded outside the timeline workbook while
retaining their ordered image/video items. Each supplied URL receives one
content index, starting at `--start-index`. Images are converted to WebP;
videos remain MP4 and receive a WebP thumbnail.

Hotel Highlight example (two URLs become content indexes `004` and `005`):

```bash
python3 tools/instagram-travel-finder/download_highlights.py \
  'https://www.instagram.com/stories/highlights/HIGHLIGHT_ID_1/' \
  'https://www.instagram.com/stories/highlights/HIGHLIGHT_ID_2/' \
  --category hotel \
  --person-slug PERSON_SLUG \
  --hotel-slug HOTEL_SLUG \
  --start-index 4 \
  --load-cookies chrome
```

Travel Highlight example (no hotel slug is accepted):

```bash
python3 tools/instagram-travel-finder/download_highlights.py \
  'https://www.instagram.com/stories/highlights/HIGHLIGHT_ID/' \
  --category travel \
  --person-slug PERSON_SLUG \
  --start-index 1 \
  --load-cookies chrome
```

Hotel filenames use
`/hotel-videos/<person-slug>/<hotel-slug>-<content-index>-<item-index>`;
travel filenames omit the hotel slug. A local resume manifest is written under
`tools/instagram-travel-finder/output/highlights/<person-slug>/`. On later runs,
`--login <saved-instagram-account>` may replace `--load-cookies chrome`.

Import one completed Highlight as one ordered mixed-media content record through
the Admin API. Preview first, then repeat with `--apply`:

```bash
export HOTELYAB_ADMIN_COOKIE='hotel_yab_session=PASTE_VALUE_HERE'
python3 tools/instagram-travel-finder/import_highlight.py \
  tools/instagram-travel-finder/output/highlights/PERSON_SLUG/hotel-004.json \
  --title 'FINAL_TITLE' \
  --dry-run
python3 tools/instagram-travel-finder/import_highlight.py \
  tools/instagram-travel-finder/output/highlights/PERSON_SLUG/hotel-004.json \
  --title 'FINAL_TITLE' \
  --apply
```

Hotel manifests resolve their hotel and use its name as the default place name.
Travel manifests require at least one explicit destination, repeated as needed:
`--destination CITY:mashhad --destination PROVINCE:razavi-khorasan`. Optional
metadata can be supplied with `--place-name`, `--place-type`,
`--caption-summary`, and `--notes`.

To curate a downloaded Highlight before import, delete the main MP4 or WebP files
that should not appear, then run `--dry-run`. The importer reports and skips those
items; filenames do not need to be renumbered when gaps remain. Do not rerun the
Highlight downloader after this manual curation, because a downloader retry will
restore files that are missing from its ready manifest.

### Stage-specific troubleshooting

#### 1. Crawl and checkpoint

- If Instagram requests login or a checkpoint, complete it in Chrome first and
  rerun the crawl. Do not repeatedly submit a password in the terminal.
- If crawling stops partway through, rerun the same profile command. Keep the
  existing JSON/checkpoint files so the crawler can resume instead of starting
  from zero.
- If a post is private, deleted, or unavailable in the current region, verify
  the original URL in the browser before deciding whether its workbook row can
  remain approved.

#### 2. JSON to review workbook

- Never regenerate the XLSX over the only manually reviewed copy. Back up the
  approved workbook before running `json_to_excel.py` again.
- A missing or unresolved person, hotel, city, or province must be corrected in
  the canonical catalog or workbook spelling; it must not be bypassed by
  manually inventing an ID.
- Keep one canonical row per Instagram post/story and use ordered media items;
  do not split carousel slides into unrelated content records.

#### 3. Download and media preparation

- `403`, checkpoint, private, deleted, or region-restricted posts are recorded
  in `<profile>.download-failures.json`. Fix only those rows and rerun; complete
  `media.json` manifests are reused.
- If Chrome cookies cannot be imported, log in to `instagram.com` in Chrome,
  allow the macOS Keychain prompt, close extra Instagram login tabs, and rerun
  with `--load-cookies chrome`.
- If preparation reports `image file is truncated`, the MP4 may still be valid
  while only its JPEG cover is incomplete. Rebuild that exact cover from the
  local video, preserving the manifest filename, then rerun preparation:

```bash
ffmpeg -y -ss 00:00:00.5 \
  -i tools/instagram-travel-finder/output/<profile>/media/<shortcode>/01.mp4 \
  -frames:v 1 \
  tools/instagram-travel-finder/output/<profile>/media/<shortcode>/01-thumbnail.jpg
python3 tools/instagram-travel-finder/import_approved.py <profile> --prepare-media
```

- A rerun is resumable: items reported as `already downloaded`, `EXISTS`, or
  already copied are not a reason to delete the whole output directory.

#### 4. Dry-run and apply

- `BLOCKED` means the row failed canonical validation. Read the reported row,
  fix its unresolved catalog relation or workbook field, rebuild the stable
  plan when needed, and rerun `--dry-run`.
- If authentication fails, confirm the API is running and export a fresh
  `HOTELYAB_ADMIN_COOKIE` in the same terminal session.
- Never use `--apply` while any row is blocked. After a clean dry-run, apply once
  and verify the created content plus its person/hotel/destination relations in
  both PostgreSQL/API and the public page.

If an individual Instagram post is deleted, private, or region-restricted, the
downloader continues with the remaining approved rows and writes
`<profile>.download-failures.json`. It skips final media preparation while any
approved row is missing. Either retry from a connection where Instagram itself
can display the post, or change that workbook row away from `approved`, then
rerun. Successful per-post manifests are retained and are not downloaded again.

The downloader first reuses complete crawler media metadata. Carousels missing
child metadata and expired CDN links are refreshed from the shortcode. Raw files
and their ordered `media.json` stay under
`output/<username>/media/<shortcode>/`. `--prepare-media` then uses the reviewed
hotel column to choose `hotel-videos` versus `travel-videos`, converts images and
video covers to WebP, preserves all mixed POST/STORY items with `-01`, `-02`, ...
suffixes, and creates a stable import plan. It does not write PostgreSQL; run the
normal `import_approved.py --dry-run` and explicit `--apply` afterward.
Because `--prepare-media` resolves canonical people, hotels, and destinations
through the protected Catalog API, the API must be running and
`HOTELYAB_ADMIN_COOKIE` must be set just like the existing importer workflow.

The approved-row importer now supports the protected Admin Catalog apply path.
The first production-reviewed batch successfully applied 32 approved travel/hotel
videos. Future batches should keep the same order: back up the reviewed workbook,
run the download preview, download/prepare approved media, run importer dry-run,
fix all blocked rows, then run explicit apply and verify the resulting PostgreSQL/public
website records.
