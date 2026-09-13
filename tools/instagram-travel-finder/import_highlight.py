import argparse
import json
import re
from pathlib import Path

from import_approved import api_get_json, api_post_json, get_collection


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[1]
WEB_PUBLIC = PROJECT_ROOT / "apps" / "web" / "public"
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def load_manifest(path: Path) -> dict:
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RuntimeError(f"Highlight manifest was not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Highlight manifest is invalid JSON: {path}") from exc

    required = {
        "status",
        "sourceUrl",
        "instagramUsername",
        "category",
        "contentKind",
        "contentType",
        "personSlug",
        "contentIndex",
        "mediaItems",
    }
    missing = sorted(required - manifest.keys())
    if missing:
        raise RuntimeError(
            "Highlight manifest is missing required fields: " + ", ".join(missing)
        )
    if manifest["status"] != "ready":
        raise RuntimeError("Highlight download is not complete; manifest is not ready.")
    if manifest["category"] not in {"HOTEL", "TRAVEL"}:
        raise RuntimeError("Highlight manifest category must be HOTEL or TRAVEL.")
    if manifest["contentKind"] != "STORY" or manifest["contentType"] != "HIGHLIGHT":
        raise RuntimeError("Highlight manifest must describe STORY/HIGHLIGHT content.")
    if not manifest["mediaItems"]:
        raise RuntimeError("Highlight manifest contains no media items.")
    return manifest


def load_catalog() -> dict:
    payload = api_get_json("/admin/catalog/bootstrap")
    return {
        "destinations": get_collection(payload, "destinations"),
        "hotels": get_collection(payload, "hotels"),
        "people": get_collection(payload, "notablePeople", "notable_people"),
        "videos": get_collection(payload, "videos"),
    }


def exact_slug(records: list[dict], slug: str, label: str) -> dict:
    matches = [record for record in records if record.get("slug") == slug]
    if len(matches) != 1:
        raise RuntimeError(f"Could not resolve exactly one {label} with slug: {slug}")
    return matches[0]


def parse_destination_ref(value: str) -> tuple[str, str]:
    try:
        destination_type, slug = value.split(":", 1)
    except ValueError as exc:
        raise ValueError("Destination must use TYPE:SLUG, such as CITY:mashhad.") from exc
    destination_type = destination_type.strip().upper()
    slug = slug.strip().lower()
    if destination_type not in {"CITY", "PROVINCE"}:
        raise ValueError("Destination type must be CITY or PROVINCE.")
    if not SLUG_PATTERN.fullmatch(slug):
        raise ValueError(f"Invalid destination slug: {slug}")
    return destination_type, slug


def resolve_destinations(catalog: dict, references: list[str]) -> list[dict]:
    result = []
    seen = set()
    for reference in references:
        destination_type, slug = parse_destination_ref(reference)
        key = (destination_type, slug)
        if key in seen:
            continue
        matches = [
            destination
            for destination in catalog["destinations"]
            if destination.get("type") == destination_type
            and destination.get("slug") == slug
        ]
        if len(matches) != 1:
            raise RuntimeError(
                f"Could not resolve exactly one destination: {destination_type}:{slug}"
            )
        seen.add(key)
        result.append(matches[0])
    return result


def validate_media(manifest: dict) -> list[dict]:
    category = manifest["category"].lower()
    person_slug = manifest["personSlug"]
    expected_prefix = (
        f"/hotel-videos/{person_slug}/{manifest.get('hotelSlug')}-"
        if category == "hotel"
        else f"/travel-videos/{person_slug}/"
    )
    result = []
    for expected_order, item in enumerate(manifest["mediaItems"], start=1):
        if item.get("displayOrder") != expected_order:
            raise RuntimeError("Highlight media displayOrder must be contiguous from 1.")
        media_type = item.get("mediaType")
        media_url = item.get("mediaUrl")
        thumbnail_url = item.get("thumbnailUrl")
        if media_type not in {"IMAGE", "VIDEO"}:
            raise RuntimeError(f"Invalid media type at item {expected_order}.")
        if not isinstance(media_url, str) or not media_url.startswith(expected_prefix):
            raise RuntimeError(f"Unexpected media path at item {expected_order}: {media_url}")
        if not isinstance(thumbnail_url, str) or not thumbnail_url.startswith(
            expected_prefix
        ):
            raise RuntimeError(
                f"Unexpected thumbnail path at item {expected_order}: {thumbnail_url}"
            )
        media_path = WEB_PUBLIC / media_url.lstrip("/")
        thumbnail_path = WEB_PUBLIC / thumbnail_url.lstrip("/")
        if not media_path.is_file() or media_path.stat().st_size <= 0:
            print(
                f"Skipped deleted media item {expected_order:02d}: {media_url}"
            )
            continue
        if not thumbnail_path.is_file() or thumbnail_path.stat().st_size <= 0:
            print(
                "Skipped media item with a deleted thumbnail "
                f"{expected_order:02d}: {thumbnail_url}"
            )
            continue
        result.append(
            {
                "mediaType": media_type,
                "mediaUrl": media_url,
                "thumbnailUrl": thumbnail_url,
            }
        )
    if not result:
        raise RuntimeError(
            "No usable media remains. Keep at least one complete image or video item."
        )
    return result


def build_payload(
    manifest: dict,
    catalog: dict,
    title: str,
    destination_refs: list[str],
    place_name: str | None,
    place_type: str | None,
    caption_summary: str | None,
    notes: str | None,
) -> dict:
    title = title.strip()
    if not title or len(title) > 240:
        raise RuntimeError("Title must contain 1 to 240 characters.")

    person = exact_slug(catalog["people"], manifest["personSlug"], "person")
    username = str(manifest["instagramUsername"] or "").strip().lstrip("@")
    person_username = str(person.get("instagramHandle") or "").strip().lstrip("@")
    if not username or username.casefold() != person_username.casefold():
        raise RuntimeError(
            "Manifest Instagram username does not match the selected notable person."
        )

    category = manifest["category"]
    hotel_ids = []
    hotel = None
    if category == "HOTEL":
        hotel_slug = str(manifest.get("hotelSlug") or "").strip()
        if not hotel_slug:
            raise RuntimeError("HOTEL Highlight manifest has no hotelSlug.")
        hotel = exact_slug(catalog["hotels"], hotel_slug, "hotel")
        hotel_ids = [hotel["id"]]

    destinations = resolve_destinations(catalog, destination_refs)
    if category == "TRAVEL" and not destinations:
        raise RuntimeError(
            "TRAVEL Highlight needs at least one --destination TYPE:SLUG."
        )

    media_items = validate_media(manifest)
    content_index = int(manifest["contentIndex"])
    video_id = f"{username}-{content_index:03d}"
    final_place_name = (place_name or (hotel.get("name") if hotel else "") or title).strip()
    final_place_type = (place_type or ("HOTEL" if hotel else "OTHER")).strip().upper()
    if len(final_place_name) > 200:
        raise RuntimeError("Place name is longer than 200 characters.")
    if not final_place_type or len(final_place_type) > 40:
        raise RuntimeError("Place type must contain 1 to 40 characters.")

    return {
        "id": video_id,
        "videoCategory": category,
        "contentKind": "STORY",
        "instagramUsername": username,
        "platform": "INSTAGRAM",
        "personCategory": person.get("primaryCategory"),
        "contentType": "HIGHLIGHT",
        "sourceUrl": manifest["sourceUrl"],
        "title": title,
        "placeName": final_place_name,
        "placeType": final_place_type,
        "publishedDate": None,
        "captionSummary": caption_summary.strip() if caption_summary else None,
        "evidenceType": "ORIGINAL_POST",
        "verificationStatus": "VERIFIED",
        "notes": notes.strip() if notes else None,
        "mediaUrl": media_items[0]["mediaUrl"],
        "thumbnailUrl": media_items[0]["thumbnailUrl"],
        "mediaItems": media_items,
        "publicationStatus": "PUBLISHED",
        "destinationIds": [destination["id"] for destination in destinations],
        "hotelIds": hotel_ids,
    }


def existing_video(catalog: dict, video_id: str) -> dict | None:
    matches = [video for video in catalog["videos"] if video.get("id") == video_id]
    if len(matches) > 1:
        raise RuntimeError(f"Catalog contains duplicate content ID: {video_id}")
    return matches[0] if matches else None


def print_preview(payload: dict, manifest_path: Path, manifest_media_count: int) -> None:
    print("Highlight import preview")
    print(f"Manifest:     {manifest_path}")
    print(f"Content ID:   {payload['id']}")
    print(f"Title:        {payload['title']}")
    print(f"Category:     {payload['videoCategory']}")
    print(f"Person:       @{payload['instagramUsername']}")
    print(f"Place:        {payload['placeName']}")
    imported_media_count = len(payload["mediaItems"])
    skipped_media_count = manifest_media_count - imported_media_count
    print(f"Media items:  {imported_media_count}/{manifest_media_count}")
    if skipped_media_count:
        print(f"Skipped:      {skipped_media_count} manually deleted item(s)")
    print(f"Destinations: {len(payload['destinationIds'])}")
    print(f"Hotels:       {len(payload['hotelIds'])}")
    print(f"Source:       {payload['sourceUrl']}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate or import one downloaded Instagram Highlight."
    )
    parser.add_argument("manifest", help="Path to a ready Highlight manifest")
    parser.add_argument("--title", required=True, help="Final public title")
    parser.add_argument(
        "--destination",
        action="append",
        default=[],
        metavar="TYPE:SLUG",
        help="Related CITY or PROVINCE; repeat for multiple destinations",
    )
    parser.add_argument("--place-name")
    parser.add_argument("--place-type")
    parser.add_argument("--caption-summary")
    parser.add_argument("--notes")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    try:
        manifest_path = Path(args.manifest).expanduser().resolve()
        manifest = load_manifest(manifest_path)
        catalog = load_catalog()
        payload = build_payload(
            manifest,
            catalog,
            args.title,
            args.destination,
            args.place_name,
            args.place_type,
            args.caption_summary,
            args.notes,
        )
        print_preview(payload, manifest_path, len(manifest["mediaItems"]))

        existing = existing_video(catalog, payload["id"])
        if existing:
            if existing.get("sourceUrl") == payload["sourceUrl"]:
                print("Result: already imported; no changes needed.")
                return
            raise RuntimeError(
                f"Content ID {payload['id']} already belongs to another source URL."
            )

        if args.dry_run:
            print("Result: ready to import. Run the same command with --apply.")
            return

        created = api_post_json("/admin/catalog/videos", payload)
        created_data = created.get("data", created) if isinstance(created, dict) else {}
        print(f"Result: imported {created_data.get('id', payload['id'])}.")
    except (RuntimeError, ValueError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
