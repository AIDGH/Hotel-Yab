import argparse
import json
import mimetypes
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    import instaloader
except ImportError:
    instaloader = None

from collector import create_loader
from import_approved import (
    clean_cell,
    content_kind_for,
    is_approved,
    load_excel_rows,
    resolve_excel_path,
    run_prepare_media,
)


USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/143.0 Safari/537.36"
)


def load_candidate_index(excel_path: Path) -> dict[str, dict]:
    json_path = excel_path.with_suffix(".json")

    if not json_path.exists():
        return {}

    records = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        raise RuntimeError(f"Candidate JSON must contain a list: {json_path}")

    return {
        str(item.get("shortcode", "")).strip(): item
        for item in records
        if isinstance(item, dict) and str(item.get("shortcode", "")).strip()
    }


def normalize_candidate_items(candidate: dict | None) -> list[dict]:
    if not candidate:
        return []

    raw_items = candidate.get("media_items")
    if isinstance(raw_items, list) and raw_items:
        items = []
        for index, item in enumerate(raw_items, start=1):
            if not isinstance(item, dict):
                continue
            media_type = str(item.get("media_type", "")).strip().upper()
            download_url = str(item.get("download_url", "")).strip()
            thumbnail_url = str(item.get("thumbnail_source_url", "")).strip()
            if media_type not in {"IMAGE", "VIDEO"} or not download_url:
                return []
            items.append(
                {
                    "displayOrder": index,
                    "mediaType": media_type,
                    "downloadUrl": download_url,
                    "thumbnailUrl": thumbnail_url,
                }
            )
        return items

    product_type = str(candidate.get("product_type", "")).strip().lower()
    media_type = candidate.get("media_type")
    if product_type == "carousel_container" or media_type in (8, "8"):
        return []

    video_url = str(candidate.get("video_download_url", "")).strip()
    image_url = str(candidate.get("thumbnail_source_url", "")).strip()
    if video_url:
        return [
            {
                "displayOrder": 1,
                "mediaType": "VIDEO",
                "downloadUrl": video_url,
                "thumbnailUrl": image_url,
            }
        ]
    if image_url:
        return [
            {
                "displayOrder": 1,
                "mediaType": "IMAGE",
                "downloadUrl": image_url,
                "thumbnailUrl": image_url,
            }
        ]
    return []


def instagram_items(loader, shortcode: str) -> list[dict]:
    if instaloader is None:
        raise RuntimeError(
            "Instaloader is required to refresh Instagram media URLs."
        )

    try:
        post = instaloader.Post.from_shortcode(loader.context, shortcode)
    except instaloader.exceptions.InstaloaderException as exc:
        raise RuntimeError(
            f"Could not refresh Instagram media for {shortcode}. "
            "Log in to Instagram in Chrome and re-run with "
            f"--load-cookies chrome. Detail: {exc}"
        ) from exc
    if post.typename == "GraphSidecar":
        nodes = list(post.get_sidecar_nodes())
        return [
            {
                "displayOrder": index,
                "mediaType": "VIDEO" if node.is_video else "IMAGE",
                "downloadUrl": str(
                    node.video_url if node.is_video else node.display_url
                ),
                "thumbnailUrl": str(node.display_url),
            }
            for index, node in enumerate(nodes, start=1)
        ]

    if post.is_video:
        return [
            {
                "displayOrder": 1,
                "mediaType": "VIDEO",
                "downloadUrl": str(post.video_url),
                "thumbnailUrl": str(post.url),
            }
        ]

    return [
        {
            "displayOrder": 1,
            "mediaType": "IMAGE",
            "downloadUrl": str(post.url),
            "thumbnailUrl": str(post.url),
        }
    ]


def validate_kind(content_kind: str, items: list[dict], shortcode: str):
    if not items:
        raise RuntimeError(f"No downloadable media found for {shortcode}")
    if content_kind == "VIDEO" and (
        len(items) != 1 or items[0]["mediaType"] != "VIDEO"
    ):
        raise RuntimeError(
            f"{shortcode} is marked as VIDEO but resolves to "
            f"{len(items)} item(s). Change the Excel content type to "
            "POST/CAROUSEL or STORY/HIGHLIGHT when appropriate."
        )


def media_extension(media_type: str, content_type: str) -> str:
    if media_type == "VIDEO":
        return ".mp4"
    guessed = mimetypes.guess_extension(content_type.split(";", 1)[0].strip())
    return guessed if guessed in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg"


def download_file(url: str, target_stem: Path, media_type: str) -> Path:
    request = Request(
        url,
        headers={"User-Agent": USER_AGENT, "Referer": "https://www.instagram.com/"},
    )
    try:
        with urlopen(request, timeout=120) as response:
            content_type = response.headers.get("Content-Type", "")
            if "text/html" in content_type.lower():
                raise RuntimeError("Instagram returned HTML instead of media")
            target = target_stem.with_suffix(
                media_extension(media_type, content_type)
            )
            temporary = target.with_name(target.name + ".part")
            target.parent.mkdir(parents=True, exist_ok=True)
            with temporary.open("wb") as output:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    output.write(chunk)
            if temporary.stat().st_size <= 0:
                temporary.unlink(missing_ok=True)
                raise RuntimeError("Downloaded file is empty")
            temporary.replace(target)
            return target
    except (HTTPError, URLError) as exc:
        raise RuntimeError(f"Media download failed: {exc}") from exc


def existing_manifest(folder: Path, content_kind: str) -> dict | None:
    path = folder / "media.json"
    if not path.exists():
        return None
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("contentKind") != content_kind:
        return None
    for item in manifest.get("items", []):
        media_path = safe_child_path(folder, item.get("mediaPath"))
        thumbnail_name = item.get("thumbnailPath")
        thumbnail_path = safe_child_path(folder, thumbnail_name) if thumbnail_name else None
        if not media_path.exists() or media_path.stat().st_size <= 0:
            return None
        if thumbnail_path and (
            not thumbnail_path.exists() or thumbnail_path.stat().st_size <= 0
        ):
            return None
    return manifest


def safe_child_path(folder: Path, value) -> Path:
    root = folder.resolve()
    candidate = (folder / str(value or "")).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise RuntimeError(f"Media manifest path escapes its folder: {value}") from exc
    return candidate


def write_manifest(folder: Path, shortcode: str, content_kind: str, items: list[dict]):
    path = folder / "media.json"
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(
            {
                "version": 1,
                "shortcode": shortcode,
                "contentKind": content_kind,
                "items": items,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def download_items(folder: Path, shortcode: str, content_kind: str, items: list[dict]):
    manifest_items = []
    for index, item in enumerate(items, start=1):
        prefix = f"{index:02d}"
        media_path = download_file(
            item["downloadUrl"], folder / prefix, item["mediaType"]
        )
        thumbnail_path = None
        if item["mediaType"] == "VIDEO" and item.get("thumbnailUrl"):
            thumbnail_path = download_file(
                item["thumbnailUrl"], folder / f"{prefix}-thumbnail", "IMAGE"
            )
        manifest_items.append(
            {
                "displayOrder": index,
                "mediaType": item["mediaType"],
                "mediaPath": media_path.name,
                "thumbnailPath": thumbnail_path.name if thumbnail_path else None,
            }
        )
    write_manifest(folder, shortcode, content_kind, manifest_items)


def approved_jobs(excel_path: Path) -> list[dict]:
    jobs = []
    for row in load_excel_rows(excel_path):
        if not is_approved(row):
            continue
        shortcode = clean_cell(row, "Shortcode")
        username = clean_cell(row, "اینستاگرام")
        content_type = clean_cell(row, "نوع محتوا").upper()
        if not shortcode or not username:
            raise RuntimeError(
                f"Approved row {row['_row_number']} needs Instagram and Shortcode"
            )
        if not re.fullmatch(r"[A-Za-z0-9._]+", username):
            raise RuntimeError(
                f"Approved row {row['_row_number']} has an invalid Instagram username"
            )
        if not re.fullmatch(r"[A-Za-z0-9_-]+", shortcode):
            raise RuntimeError(
                f"Approved row {row['_row_number']} has an invalid Shortcode"
            )
        jobs.append(
            {
                "row": row["_row_number"],
                "shortcode": shortcode,
                "username": username,
                "contentKind": content_kind_for(content_type),
            }
        )
    return jobs


def run(
    excel_path: Path,
    *,
    download: bool,
    login: str | None,
    browser: str | None,
    cookie_file: str | None,
    prepare: bool,
):
    jobs = approved_jobs(excel_path)
    candidates = load_candidate_index(excel_path)
    loader = None
    downloaded = 0
    existing = 0
    needs_refresh = 0
    failures = []

    print(f"Approved rows: {len(jobs)}")
    for index, job in enumerate(jobs, start=1):
        folder = excel_path.parent / job["username"] / "media" / job["shortcode"]
        if existing_manifest(folder, job["contentKind"]):
            existing += 1
            print(f"[{index}/{len(jobs)}] {job['shortcode']} — already downloaded")
            continue

        items = normalize_candidate_items(candidates.get(job["shortcode"]))
        requires_refresh = not items
        if not download:
            needs_refresh += int(requires_refresh)
            source = "Instagram refresh" if requires_refresh else "candidate JSON"
            print(
                f"[{index}/{len(jobs)}] {job['shortcode']} — "
                f"{job['contentKind']} — {source}"
            )
            continue

        if not requires_refresh:
            try:
                validate_kind(job["contentKind"], items, job["shortcode"])
                download_items(
                    folder,
                    job["shortcode"],
                    job["contentKind"],
                    items,
                )
            except RuntimeError:
                requires_refresh = True
            else:
                downloaded += 1
                print(
                    f"[{index}/{len(jobs)}] {job['shortcode']} — "
                    f"downloaded {len(items)} item(s)"
                )
                continue

        if loader is None:
            loader = create_loader(
                login,
                browser=browser,
                cookie_file=cookie_file,
                interactive_login=False,
            )

        try:
            items = instagram_items(loader, job["shortcode"])
            validate_kind(job["contentKind"], items, job["shortcode"])
            download_items(
                folder,
                job["shortcode"],
                job["contentKind"],
                items,
            )
        except RuntimeError as exc:
            failure = {
                "row": job["row"],
                "shortcode": job["shortcode"],
                "sourceUrl": f"https://www.instagram.com/p/{job['shortcode']}/",
                "error": str(exc),
            }
            failures.append(failure)
            print(
                f"[{index}/{len(jobs)}] {job['shortcode']} — FAILED — {exc}"
            )
            continue

        downloaded += 1
        print(
            f"[{index}/{len(jobs)}] {job['shortcode']} — "
            f"downloaded {len(items)} item(s)"
        )

    print()
    print(f"Downloaded: {downloaded}")
    print(f"Already present: {existing}")
    print(f"Failed: {len(failures)}")
    if not download:
        print(f"Needs Instagram refresh: {needs_refresh}")
        print("No files were downloaded.")

    failure_report = None
    if download:
        failure_report = excel_path.with_name(
            f"{excel_path.stem}.download-failures.json"
        )
        failure_report.write_text(
            json.dumps(failures, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    if failures:
        print(f"Failure report: {failure_report}")
        if prepare:
            print(
                "Media preparation was skipped because the approved batch is "
                "incomplete. Fix/reclassify the failed rows and rerun."
            )
        return False

    if prepare:
        run_prepare_media(excel_path)
    return True


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Download media for approved Instagram workbook rows and optionally "
            "prepare final Hotel-Yab public paths."
        )
    )
    parser.add_argument("excel", help="Reviewed XLSX path or profile name")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--download", action="store_true")
    authentication = parser.add_mutually_exclusive_group()
    authentication.add_argument(
        "--login",
        help="Instagram account with an existing saved Instaloader session",
    )
    authentication.add_argument(
        "--load-cookies",
        metavar="BROWSER",
        help=(
            "Import the active Instagram session from a browser, for example "
            "chrome"
        ),
    )
    parser.add_argument(
        "--cookie-file",
        help="Optional browser cookie database path for a non-default profile",
    )
    parser.add_argument(
        "--prepare-media",
        action="store_true",
        help="After download, copy/convert media into apps/web/public",
    )
    args = parser.parse_args()
    if args.prepare_media and not args.download:
        parser.error("--prepare-media requires --download")
    if args.cookie_file and not args.load_cookies:
        parser.error("--cookie-file requires --load-cookies")
    succeeded = run(
        resolve_excel_path(args.excel),
        download=args.download,
        login=args.login,
        browser=args.load_cookies,
        cookie_file=args.cookie_file,
        prepare=args.prepare_media,
    )
    if not succeeded:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
