import sys
import time

from collector import parse_graphql_response
from graphql_client import fetch_profile_page

import json
from pathlib import Path
from http.client import IncompleteRead
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"


def thumbnail_file(
    username: str,
    shortcode: str,
) -> Path:
    folder = (
        OUTPUT_DIR
        / username
        / "thumbnails"
    )

    folder.mkdir(
        parents=True,
        exist_ok=True,
    )

    return (
        folder
        / f"{shortcode}.jpg"
    )


def relative_output_path(
    path: Path,
) -> str:
    try:
        return str(
            path.relative_to(
                BASE_DIR
            )
        )
    except ValueError:
        return str(
            path
        )


def download_thumbnail(
    username: str,
    post: dict,
) -> str:
    shortcode = str(
        post.get(
            "shortcode",
            "",
        )
        or ""
    ).strip()

    source_url = str(
        post.get(
            "thumbnail_source_url",
            "",
        )
        or ""
    ).strip()

    if (
        not shortcode
        or not source_url
    ):
        return ""

    target = thumbnail_file(
        username,
        shortcode,
    )

    if (
        target.exists()
        and target.stat().st_size
        > 0
    ):
        return relative_output_path(
            target
        )

    temporary = target.with_suffix(
        ".jpg.part"
    )

    for attempt in range(
        1,
        4,
    ):
        request = Request(
            source_url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 "
                    "(Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 "
                    "(KHTML, like Gecko) "
                    "Chrome/143.0 Safari/537.36"
                ),
                "Referer": (
                    "https://www.instagram.com/"
                ),
            },
        )

        try:
            with urlopen(
                request,
                timeout=30,
            ) as response:
                content = response.read()

            if not content:
                raise RuntimeError(
                    "empty thumbnail response"
                )

            temporary.write_bytes(
                content
            )

            temporary.replace(
                target
            )

            print(
                "Thumbnail saved:",
                relative_output_path(
                    target
                ),
            )

            return relative_output_path(
                target
            )

        except IncompleteRead as exc:
            if temporary.exists():
                temporary.unlink()

            if attempt < 3:
                print(
                    "Thumbnail response incomplete, retrying:",
                    shortcode,
                    f"({attempt}/3)",
                )

                time.sleep(
                    1.5
                )

                continue

            print(
                "Thumbnail download skipped after incomplete response:",
                shortcode,
                "|",
                exc,
            )

            return ""

        except (
            HTTPError,
            URLError,
            OSError,
            RuntimeError,
        ) as exc:
            if temporary.exists():
                temporary.unlink()

            if (
                attempt < 3
                and not isinstance(
                    exc,
                    HTTPError,
                )
            ):
                print(
                    "Thumbnail download retry:",
                    shortcode,
                    f"({attempt}/3)",
                    "|",
                    exc,
                )

                time.sleep(
                    1.5
                )

                continue

            print(
                "Thumbnail download skipped:",
                shortcode,
                "|",
                exc,
            )

            return ""


def fetch_page_safely(
    username: str,
    after: str | None,
):
    for count, wait in [
        (6, 5),
        (3, 10),
        (1, 15),
    ]:
        try:
            return fetch_profile_page(
                username,
                after=after,
                count=count,
            )

        except RuntimeError as exc:
            if "response was incomplete" not in str(exc):
                raise

            print(
                f"Response incomplete with {count} posts."
            )

            time.sleep(wait)

    return None

def crawl_profile(
    username: str,
    max_pages: int = 10000,
    delay_seconds: int = 5,
    should_stop=None,
    on_progress=None,
):
    all_posts = []

    checkpoint = load_checkpoint(username)

    if checkpoint:
        after = checkpoint["after"]
        start_page = checkpoint["next_page"]
        processed_posts = checkpoint[
            "processed_posts"
        ]

        print(
            f"Resuming from page {start_page}..."
        )
    else:
        after = None
        start_page = 1
        processed_posts = 0

    for page_number in range(
        start_page,
        max_pages + 1,
    ):
        if should_stop and should_stop():
            raise InterruptedError("کرال متوقف شد؛ قابل ادامه است")
        print(f"Fetching page {page_number}...")

        payload = fetch_page_safely(
            username,
            after,
        )

        if payload is None:
            print(
                "Could not fetch this page. "
                "Stopping crawl safely."
            )
            break

        result = parse_graphql_response(
            payload
        )

        posts = result["posts"]
        all_posts.extend(posts)

        processed_posts += len(posts)

        if on_progress:
            on_progress(page_number, processed_posts)

        save_matches(
            username,
            posts,
        )

        save_checkpoint(
            username,
            result["end_cursor"],
            page_number + 1,
            processed_posts,
        )

        matches = [
            post
            for post in posts
            if post["is_iran_travel"]
        ]

        print(
            f"Page {page_number}: "
            f"{len(posts)} posts, "
            f"{len(matches)} Iran matches"
        )

        for post in matches:
            print(
                "  ",
                post["post_url"],
                "|",
                post["matched_cities"],
                "|",
                post["matched_provinces"],
            )

        if not result["has_next_page"]:
                print("Reached end of profile.")

                path = checkpoint_file(username)

                if path.exists():
                    path.unlink()

                break

        after = result["end_cursor"]

        if not after:
            print("No end cursor returned.")
            break

        if page_number < max_pages:
            time.sleep(delay_seconds)

    return all_posts


def checkpoint_file(username: str) -> Path:
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    return (
        OUTPUT_DIR
        / f"{username}.checkpoint.json"
    )


def save_checkpoint(
    username: str,
    after: str | None,
    next_page: int,
    processed_posts: int,
):
    path = checkpoint_file(username)

    with path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            {
                "after": after,
                "next_page": next_page,
                "processed_posts": processed_posts,
            },
            file,
            ensure_ascii=False,
            indent=2,
        )


def load_checkpoint(username: str):
    path = checkpoint_file(username)

    if not path.exists():
        return None

    with path.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)
    
def save_matches(
    username: str,
    posts: list[dict],
):
    matches = [
        post
        for post in posts
        if post[
            "is_iran_travel"
        ]
    ]

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_file = (
        OUTPUT_DIR
        / f"{username}.json"
    )

    existing = []

    if output_file.exists():
        with output_file.open(
            "r",
            encoding="utf-8",
        ) as file:
            existing = json.load(
                file
            )

    by_shortcode = {
        item[
            "shortcode"
        ]: item
        for item in existing
        if item.get(
            "shortcode"
        )
    }

    for post in matches:
        shortcode = post[
            "shortcode"
        ]

        previous = dict(
            by_shortcode.get(
                shortcode,
                {},
            )
        )

        local_thumbnail = (
            download_thumbnail(
                username,
                post,
            )
        )

        if (
            not local_thumbnail
            and previous.get(
                "thumbnail_local_path"
            )
        ):
            local_thumbnail = (
                previous[
                    "thumbnail_local_path"
                ]
            )

        record = dict(
            previous
        )

        record.update(
            {
                "instagram_username": (
                    post[
                        "username"
                    ]
                ),
                "source_url": (
                    post[
                        "post_url"
                    ]
                ),
                "shortcode": shortcode,
                "published_at": (
                    post[
                        "published_at"
                    ]
                ),
                "caption": (
                    post[
                        "caption"
                    ]
                ),
                "instagram_location": (
                    post[
                        "location"
                    ]
                ),
                "product_type": (
                    post.get(
                        "product_type",
                        "",
                    )
                ),
                "media_type": (
                    post.get(
                        "media_type",
                        "",
                    )
                ),
                "signal_strength": (
                    post.get(
                        "signal_strength",
                        "",
                    )
                ),
                "signal_score": (
                    post.get(
                        "signal_score",
                        0,
                    )
                ),
                "content_type": (
                    post.get(
                        "content_type",
                        "",
                    )
                ),
                "content_bonus": (
                    post.get(
                        "content_bonus",
                        0,
                    )
                ),
                "ranking_score": (
                    post.get(
                        "ranking_score",
                        post.get(
                            "signal_score",
                            0,
                        ),
                    )
                ),
                "candidate_signals": (
                    post.get(
                        "candidate_signals",
                        [],
                    )
                ),
                "is_hotel_priority": (
                    post.get(
                        "is_hotel_priority",
                        False,
                    )
                ),
                "priority": (
                    post.get(
                        "priority",
                        "",
                    )
                ),
                "matched_cities": (
                    post[
                        "matched_cities"
                    ]
                ),
                "matched_city_slugs": (
                    post[
                        "matched_city_slugs"
                    ]
                ),
                "matched_provinces": (
                    post[
                        "matched_provinces"
                    ]
                ),
                "matched_province_slugs": (
                    post[
                        "matched_province_slugs"
                    ]
                ),
                "video_download_url": (
                    post.get(
                        "video_download_url",
                        "",
                    )
                ),
                "video_width": (
                    post.get(
                        "video_width"
                    )
                ),
                "video_height": (
                    post.get(
                        "video_height"
                    )
                ),
                "thumbnail_source_url": (
                    post.get(
                        "thumbnail_source_url",
                        "",
                    )
                ),
                "thumbnail_width": (
                    post.get(
                        "thumbnail_width"
                    )
                ),
                "thumbnail_height": (
                    post.get(
                        "thumbnail_height"
                    )
                ),
                "media_items": (
                    post.get(
                        "media_items",
                        [],
                    )
                ),
                "thumbnail_local_path": (
                    local_thumbnail
                ),
            }
        )

        record.setdefault(
            "review_status",
            "pending",
        )

        record.setdefault(
            "notes",
            "",
        )

        by_shortcode[
            shortcode
        ] = record

    data = list(
        by_shortcode.values()
    )

    with output_file.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2,
        )

    thumbnail_count = sum(
        1
        for item in data
        if item.get(
            "thumbnail_local_path"
        )
    )

    print(
        f"Saved matches: {len(data)}"
    )

    print(
        "Cached thumbnails:",
        thumbnail_count,
    )


if __name__ == "__main__":
    username = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "morteza.kowsari"
    )

    posts = crawl_profile(username)

    matches = [
        post
        for post in posts
        if post["is_iran_travel"]
    ]

    print("\n--- SUMMARY ---")
    print("Total posts:", len(posts))
    print("Iran matches:", len(matches))

    save_matches(
        username,
        posts,
    )
