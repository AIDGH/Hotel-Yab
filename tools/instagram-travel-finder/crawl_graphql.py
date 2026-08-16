import json
import sys
import time
from pathlib import Path

from collector import (
    parse_graphql_response,
)
from graphql_client import (
    fetch_profile_page,
)


BASE_DIR = (
    Path(__file__).resolve().parent
)

OUTPUT_DIR = (
    BASE_DIR
    / "output"
)

STRENGTH_ORDER = {
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
    "NONE": 0,
}


def get_output_dir() -> Path:
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    return OUTPUT_DIR


def checkpoint_file(
    username: str,
) -> Path:
    return (
        get_output_dir()
        / (
            f"{username}"
            ".checkpoint.json"
        )
    )


def matches_file(
    username: str,
) -> Path:
    return (
        get_output_dir()
        / f"{username}.json"
    )


def write_json(
    path: Path,
    data,
):
    temp_path = path.with_suffix(
        path.suffix + ".tmp"
    )

    with temp_path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2,
        )

    temp_path.replace(path)


def save_checkpoint(
    username: str,
    after: str,
    next_page: int,
    processed_posts: int,
):
    write_json(
        checkpoint_file(
            username
        ),
        {
            "after": after,
            "next_page": next_page,
            "processed_posts": (
                processed_posts
            ),
        },
    )


def load_checkpoint(
    username: str,
):
    path = checkpoint_file(
        username
    )

    if not path.exists():
        return None

    with path.open(
        "r",
        encoding="utf-8",
    ) as file:
        checkpoint = (
            json.load(file)
        )

    if not checkpoint.get(
        "after"
    ):
        return None

    return checkpoint


def remove_checkpoint(
    username: str,
):
    path = checkpoint_file(
        username
    )

    if path.exists():
        path.unlink()


def load_saved_matches(
    username: str,
) -> list[dict]:
    path = matches_file(
        username
    )

    if not path.exists():
        return []

    with path.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def candidate_sort_key(
    item: dict,
):
    hotel_priority = (
        1
        if item.get(
            "is_hotel_priority",
            False,
        )
        else 0
    )

    strength = item.get(
        "signal_strength",
        "NONE",
    )

    score = item.get(
        "signal_score",
        0,
    )

    published_at = item.get(
        "published_at",
        "",
    )

    return (
        hotel_priority,
        STRENGTH_ORDER.get(
            strength,
            0,
        ),
        score,
        published_at,
    )

def is_saved_candidate(
    post: dict,
) -> bool:
    return bool(
        post.get(
            "is_hotel_priority",
            False,
        )
        or post.get(
            "is_iran_travel",
            False,
        )
    )

def save_matches(
    username: str,
    posts: list[dict],
):
    matches = [
        post
        for post in posts
        if is_saved_candidate(
            post
        )
    ]

    existing = (
        load_saved_matches(
            username
        )
    )

    by_shortcode = {
        item["shortcode"]: item
        for item in existing
    }

    for post in matches:
        previous = (
            by_shortcode.get(
                post["shortcode"],
                {},
            )
        )

        by_shortcode[
            post["shortcode"]
        ] = {
            "instagram_username": (
                post["username"]
            ),
            "source_url": (
                post["post_url"]
            ),
            "shortcode": (
                post["shortcode"]
            ),
            "published_at": (
                post["published_at"]
            ),
            "signal_strength": (
                post[
                    "signal_strength"
                ]
            ),
            "signal_score": (
                post[
                    "signal_score"
                ]
            ),
            "candidate_signals": (
                post[
                    "candidate_signals"
                ]
            ),
            "caption": (
                post["caption"]
            ),
            "instagram_location": (
                post["location"]
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
            "is_hotel_priority": (
                post.get(
                    "is_hotel_priority",
                    False,
                )
            ),
            "priority": (
                "HOTEL"
                if post.get(
                    "is_hotel_priority",
                    False,
                )
                else post[
                    "signal_strength"
                ]
            ),
            "review_status": (
                previous.get(
                    "review_status",
                    "pending",
                )
            ),
            "notes": (
                previous.get(
                    "notes",
                    "",
                )
            ),
        }

    data = list(
        by_shortcode.values()
    )

    data.sort(
        key=candidate_sort_key,
        reverse=True,
    )

    write_json(
        matches_file(username),
        data,
    )

    high_count = sum(
        item.get(
            "signal_strength"
        ) == "HIGH"
        for item in data
    )

    medium_count = sum(
        item.get(
            "signal_strength"
        ) == "MEDIUM"
        for item in data
    )

    low_count = sum(
        item.get(
            "signal_strength"
        ) == "LOW"
        for item in data
    )

    print(
        "Saved candidates: "
        f"{len(data)} "
        f"(HIGH {high_count}, "
        f"MEDIUM {medium_count}, "
        f"LOW {low_count})"
    )


def fetch_page_safely(
    username: str,
    after: str | None,
):
    attempts = [
        (6, 5),
        (3, 10),
        (1, 15),
    ]

    for (
        count,
        wait_seconds,
    ) in attempts:
        try:
            return (
                fetch_profile_page(
                    username,
                    after=after,
                    count=count,
                )
            )

        except RuntimeError as exc:
            message = str(exc)

            transient = (
                (
                    "response was incomplete"
                    in message
                )
                or (
                    "Instagram request failed:"
                    in message
                )
            )

            if not transient:
                raise

            print(
                "Temporary error with "
                f"{count} posts."
            )

            time.sleep(
                wait_seconds
            )

    return None


def crawl_profile(
    username: str,
    delay_seconds: int = 5,
    retry_delay_seconds: int = 30,
):
    all_posts = []

    checkpoint = (
        load_checkpoint(
            username
        )
    )

    if checkpoint:
        after = checkpoint[
            "after"
        ]

        page_number = checkpoint[
            "next_page"
        ]

        processed_posts = (
            checkpoint[
                "processed_posts"
            ]
        )

        print(
            "Resuming from page "
            f"{page_number}..."
        )

    else:
        after = None
        page_number = 1
        processed_posts = 0

    try:
        while True:
            print(
                "Fetching page "
                f"{page_number}..."
            )

            payload = (
                fetch_page_safely(
                    username,
                    after,
                )
            )

            if payload is None:
                print(
                    "Instagram is "
                    "temporarily unavailable."
                )

                print(
                    "Retrying the same "
                    f"page in "
                    f"{retry_delay_seconds}"
                    " seconds..."
                )

                time.sleep(
                    retry_delay_seconds
                )

                continue

            result = (
                parse_graphql_response(
                    payload
                )
            )

            posts = result[
                "posts"
            ]

            has_next_page = result[
                "has_next_page"
            ]

            next_after = result[
                "end_cursor"
            ]

            if (
                has_next_page
                and not next_after
            ):
                save_matches(
                    username,
                    posts,
                )

                print(
                    "No end cursor "
                    "returned."
                )

                print(
                    "Retrying the same "
                    f"page in "
                    f"{retry_delay_seconds}"
                    " seconds..."
                )

                time.sleep(
                    retry_delay_seconds
                )

                continue

            all_posts.extend(
                posts
            )

            processed_posts += len(
                posts
            )

            matches = [
                post
                for post in posts
                if is_saved_candidate(
                    post
                )
            ]

            save_matches(
                username,
                posts,
            )

            print(
                f"Page {page_number}: "
                f"{len(posts)} posts, "
                f"{len(matches)} "
                "Iran candidates"
            )

            for post in matches:
                print(
                    "  ",
                    (
                        post.get(
                            "priority",
                            post[
                                "signal_strength"
                            ],
                        )
                    ),
                    (
                        post[
                            "signal_score"
                        ]
                    ),
                    "|",
                    post["post_url"],
                    "|",
                    (
                        post[
                            "matched_cities"
                        ]
                    ),
                    "|",
                    (
                        post[
                            "matched_provinces"
                        ]
                    ),
                )

            if not has_next_page:
                print(
                    "Reached end "
                    "of profile."
                )

                remove_checkpoint(
                    username
                )

                break

            after = next_after

            page_number += 1

            save_checkpoint(
                username,
                after,
                page_number,
                processed_posts,
            )

            time.sleep(
                delay_seconds
            )

    except KeyboardInterrupt:
        print(
            "\nCrawler stopped "
            "by user."
        )

        print(
            "Checkpoint is safe."
        )

        print(
            "Next run will resume "
            f"from page "
            f"{page_number}."
        )

    return (
        all_posts,
        processed_posts,
    )


if __name__ == "__main__":
    username = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "morteza.kowsari"
    )

    (
        posts,
        processed_posts,
    ) = crawl_profile(
        username
    )

    matches_this_run = [
        post
        for post in posts
        if post[
            "is_iran_travel"
        ]
    ]

    saved_matches = (
        load_saved_matches(
            username
        )
    )

    print(
        "\n--- SUMMARY ---"
    )

    print(
        "Posts this run:",
        len(posts),
    )

    print(
        "Total processed:",
        processed_posts,
    )

    print(
        "Candidates this run:",
        len(matches_this_run),
    )

    print(
        "Saved candidates:",
        len(saved_matches),
    )

    print(
        "Output:",
        matches_file(username),
    )