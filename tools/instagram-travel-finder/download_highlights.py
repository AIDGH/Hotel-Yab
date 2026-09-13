import argparse
import json
import re
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

from collector import create_loader


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[1]
WEB_PUBLIC = PROJECT_ROOT / "apps" / "web" / "public"
OUTPUT_DIR = BASE_DIR / "output" / "highlights"
HIGHLIGHT_URL_PATTERN = re.compile(
    r"^https?://(?:www\.)?instagram\.com/stories/highlights/(\d+)/?(?:\?.*)?$",
    re.IGNORECASE,
)
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def parse_highlight_id(value: str) -> str:
    match = HIGHLIGHT_URL_PATTERN.fullmatch(value.strip())
    if not match:
        raise ValueError(
            "Highlight URL must look like "
            "https://www.instagram.com/stories/highlights/123456789/"
        )
    return match.group(1)


def validate_slug(value: str, label: str) -> str:
    normalized = value.strip().lower()
    if not SLUG_PATTERN.fullmatch(normalized):
        raise ValueError(
            f"{label} must be a lowercase Hotel-Yab slug using letters, "
            "numbers, and single hyphens."
        )
    return normalized


def target_stem(
    category: str,
    person_slug: str,
    hotel_slug: str | None,
    content_index: int,
    item_index: int,
) -> Path:
    media_root = "hotel-videos" if category == "hotel" else "travel-videos"
    prefix = (
        f"{hotel_slug}-{content_index:03d}"
        if category == "hotel"
        else f"{content_index:03d}"
    )
    return WEB_PUBLIC / media_root / person_slug / f"{prefix}-{item_index:02d}"


def public_path(path: Path) -> str:
    return "/" + path.relative_to(WEB_PUBLIC).as_posix()


def best_url(candidates: list[dict]) -> str:
    usable = [
        candidate
        for candidate in candidates
        if isinstance(candidate, dict) and candidate.get("url")
    ]
    if not usable:
        raise RuntimeError("Instagram returned no downloadable media URL.")
    selected = max(
        usable,
        key=lambda candidate: int(candidate.get("width") or 0)
        * int(candidate.get("height") or 0),
    )
    return str(selected["url"])


def fetch_highlight(loader, highlight_id: str) -> dict:
    key = f"highlight:{highlight_id}"
    try:
        payload = loader.context.get_iphone_json(
            path=f"api/v1/feed/reels_media/?reel_ids={key}",
            params={},
        )
    except Exception as exc:
        raise RuntimeError(
            f"Could not fetch Highlight {highlight_id}. Refresh the Instagram "
            "session with --load-cookies chrome and retry. Detail: {exc}"
        ) from exc

    reels = payload.get("reels") if isinstance(payload, dict) else None
    if not isinstance(reels, dict):
        raise RuntimeError(f"Instagram returned no Highlight data for {highlight_id}.")

    reel = reels.get(key) or reels.get(highlight_id)
    if not isinstance(reel, dict) and len(reels) == 1:
        reel = next(iter(reels.values()))
    if not isinstance(reel, dict):
        raise RuntimeError(f"Highlight {highlight_id} was not found or is unavailable.")

    items = reel.get("items")
    if not isinstance(items, list) or not items:
        raise RuntimeError(f"Highlight {highlight_id} contains no downloadable items.")
    return reel


def normalized_items(reel: dict) -> list[dict]:
    result = []
    for index, item in enumerate(reel["items"], start=1):
        if not isinstance(item, dict):
            raise RuntimeError(f"Highlight item {index} has an invalid structure.")
        media_type = "VIDEO" if int(item.get("media_type") or 1) == 2 else "IMAGE"
        image_url = best_url(
            ((item.get("image_versions2") or {}).get("candidates") or [])
        )
        media_url = (
            best_url(item.get("video_versions") or [])
            if media_type == "VIDEO"
            else image_url
        )
        result.append(
            {
                "displayOrder": index,
                "storyItemId": str(item.get("pk") or item.get("id") or index),
                "mediaType": media_type,
                "downloadUrl": media_url,
                "thumbnailUrl": image_url,
            }
        )
    return result


def get_response(loader, url: str):
    try:
        response = loader.context.get_raw(url)
        response.raise_for_status()
        return response
    except Exception as exc:
        raise RuntimeError(f"Media download failed: {exc}") from exc


def download_video(loader, url: str, target: Path) -> str:
    if target.exists() and target.stat().st_size > 0:
        return "EXISTS"
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + ".part")
    response = get_response(loader, url)
    try:
        with temporary.open("wb") as output:
            for chunk in response.iter_content(1024 * 1024):
                if chunk:
                    output.write(chunk)
        if temporary.stat().st_size <= 0:
            raise RuntimeError("Downloaded video is empty.")
        temporary.replace(target)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    return "DOWNLOADED"


def download_webp(loader, url: str, target: Path) -> str:
    if target.exists() and target.stat().st_size > 0:
        return "EXISTS"
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + ".part")
    response = get_response(loader, url)
    try:
        with Image.open(BytesIO(response.content)) as source:
            image = ImageOps.exif_transpose(source)
            mode = "RGBA" if "A" in image.getbands() else "RGB"
            image.convert(mode).save(
                temporary,
                format="WEBP",
                quality=90,
                method=6,
            )
        if temporary.stat().st_size <= 0:
            raise RuntimeError("Converted image is empty.")
        temporary.replace(target)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    return "CONVERTED"


def manifest_path(person_slug: str, category: str, content_index: int) -> Path:
    return OUTPUT_DIR / person_slug / f"{category}-{content_index:03d}.json"


def write_manifest(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def verify_resume_manifest(path: Path, planned: dict, targets: list[Path]) -> None:
    if not path.exists():
        collisions = [target for target in targets if target.exists()]
        if collisions:
            formatted = "\n".join(f" - {target}" for target in collisions)
            raise RuntimeError(
                "Target files already exist without a matching Highlight manifest:\n"
                f"{formatted}"
            )
        return

    existing = json.loads(path.read_text(encoding="utf-8"))
    identity_fields = [
        "highlightId",
        "sourceUrl",
        "category",
        "personSlug",
        "hotelSlug",
        "contentIndex",
    ]
    if any(existing.get(field) != planned.get(field) for field in identity_fields):
        raise RuntimeError(
            f"Existing manifest does not match the requested Highlight: {path}"
        )
    existing_ids = [item.get("storyItemId") for item in existing.get("mediaItems", [])]
    planned_ids = [item.get("storyItemId") for item in planned.get("mediaItems", [])]
    if existing_ids != planned_ids:
        raise RuntimeError(
            f"Highlight items changed since the previous run. Review the manifest: {path}"
        )


def download_highlight(
    loader,
    source_url: str,
    category: str,
    person_slug: str,
    hotel_slug: str | None,
    content_index: int,
    expected_owner: str | None,
) -> dict:
    highlight_id = parse_highlight_id(source_url)
    reel = fetch_highlight(loader, highlight_id)
    owner = str((reel.get("user") or {}).get("username") or "").lower()
    if expected_owner and owner and owner != expected_owner.lower():
        raise RuntimeError(
            f"Highlight {highlight_id} belongs to @{owner}, not @{expected_owner}."
        )

    items = normalized_items(reel)
    media_items = []
    targets = []
    for item in items:
        stem = target_stem(
            category,
            person_slug,
            hotel_slug,
            content_index,
            item["displayOrder"],
        )
        media_path = stem.with_suffix(
            ".mp4" if item["mediaType"] == "VIDEO" else ".webp"
        )
        thumbnail_path = (
            stem.with_name(stem.name + "-thumbnail").with_suffix(".webp")
            if item["mediaType"] == "VIDEO"
            else media_path
        )
        targets.append(media_path)
        if thumbnail_path != media_path:
            targets.append(thumbnail_path)
        media_items.append(
            {
                "displayOrder": item["displayOrder"],
                "storyItemId": item["storyItemId"],
                "mediaType": item["mediaType"],
                "mediaUrl": public_path(media_path),
                "thumbnailUrl": public_path(thumbnail_path),
            }
        )

    manifest = {
        "version": 1,
        "status": "downloading",
        "highlightId": highlight_id,
        "sourceUrl": source_url,
        "title": str(reel.get("title") or ""),
        "instagramUsername": owner or expected_owner,
        "category": category.upper(),
        "contentKind": "STORY",
        "contentType": "HIGHLIGHT",
        "personSlug": person_slug,
        "hotelSlug": hotel_slug,
        "contentIndex": content_index,
        "mediaItems": media_items,
    }
    path = manifest_path(person_slug, category, content_index)
    verify_resume_manifest(path, manifest, targets)
    write_manifest(path, manifest)

    print(
        f"Highlight {highlight_id} — {len(items)} item(s) — "
        f"content index {content_index:03d}"
    )
    for item, media in zip(items, media_items):
        media_target = WEB_PUBLIC / media["mediaUrl"].lstrip("/")
        if item["mediaType"] == "VIDEO":
            media_status = download_video(loader, item["downloadUrl"], media_target)
            thumbnail_target = WEB_PUBLIC / media["thumbnailUrl"].lstrip("/")
            thumbnail_status = download_webp(
                loader,
                item["thumbnailUrl"],
                thumbnail_target,
            )
            print(
                f"  {item['displayOrder']:02d} VIDEO {media['mediaUrl']} "
                f"({media_status}); thumbnail ({thumbnail_status})"
            )
        else:
            media_status = download_webp(loader, item["downloadUrl"], media_target)
            print(
                f"  {item['displayOrder']:02d} IMAGE {media['mediaUrl']} "
                f"({media_status})"
            )

    manifest["status"] = "ready"
    write_manifest(path, manifest)
    print(f"Manifest: {path}")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Download Instagram Highlight items directly into stable Hotel-Yab "
            "public media paths."
        )
    )
    parser.add_argument("highlight_urls", nargs="+", help="Instagram Highlight URL(s)")
    parser.add_argument("--category", choices=["hotel", "travel"], required=True)
    parser.add_argument("--person-slug", required=True)
    parser.add_argument("--hotel-slug")
    parser.add_argument("--start-index", type=int, required=True)
    parser.add_argument(
        "--instagram-username",
        help="Optional expected owner; fails safely if the Highlight belongs elsewhere",
    )
    authentication = parser.add_mutually_exclusive_group(required=True)
    authentication.add_argument(
        "--login",
        help="Instagram account with an existing saved Instaloader session",
    )
    authentication.add_argument(
        "--load-cookies",
        metavar="BROWSER",
        help="Import the active Instagram session from a browser, such as chrome",
    )
    parser.add_argument(
        "--cookie-file",
        help="Optional browser cookie database path for a non-default profile",
    )
    args = parser.parse_args()

    if args.start_index < 1:
        parser.error("--start-index must be at least 1")
    if args.category == "hotel" and not args.hotel_slug:
        parser.error("--hotel-slug is required for --category hotel")
    if args.category == "travel" and args.hotel_slug:
        parser.error("--hotel-slug cannot be used with --category travel")
    if args.cookie_file and not args.load_cookies:
        parser.error("--cookie-file requires --load-cookies")

    try:
        person_slug = validate_slug(args.person_slug, "Person slug")
        hotel_slug = (
            validate_slug(args.hotel_slug, "Hotel slug")
            if args.hotel_slug
            else None
        )
        for value in args.highlight_urls:
            parse_highlight_id(value)
    except ValueError as exc:
        parser.error(str(exc))

    loader = create_loader(
        args.login,
        browser=args.load_cookies,
        cookie_file=args.cookie_file,
        interactive_login=False,
    )
    for offset, source_url in enumerate(args.highlight_urls):
        download_highlight(
            loader,
            source_url,
            args.category,
            person_slug,
            hotel_slug,
            args.start_index + offset,
            args.instagram_username,
        )


if __name__ == "__main__":
    main()
