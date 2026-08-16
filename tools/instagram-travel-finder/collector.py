import argparse
import csv
import re
from datetime import datetime, timezone
from pathlib import Path

try:
    import instaloader
except ImportError:
    instaloader = None

import random
import time

from detector import detect_locations


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"


def extract_username(
    value: str,
) -> str:
    value = value.strip()

    value = re.sub(
        (
            r"^https?://"
            r"(www\.)?"
            r"instagram\.com/"
        ),
        "",
        value,
        flags=re.IGNORECASE,
    )

    value = value.split("?")[0]
    value = value.strip("/")

    if value.startswith("@"):
        value = value[1:]

    if "/" in value:
        value = value.split("/")[0]

    if not value:
        raise ValueError(
            "Instagram username "
            "could not be detected."
        )

    return value


def create_loader(
    login_user: str | None,
):
    if instaloader is None:
        raise RuntimeError(
            "Instaloader is not installed."
        )

    loader = (
        instaloader.Instaloader(
            max_connection_attempts=1,
        )
    )

    if not login_user:
        return loader

    try:
        print(
            "Loading Instagram "
            f"session for @{login_user}..."
        )

        loader.load_session_from_file(
            login_user
        )

    except FileNotFoundError:
        print(
            "Saved session not found."
        )

        loader.interactive_login(
            login_user
        )

        loader.save_session_to_file()

    return loader


def join_names(
    items,
):
    return " | ".join(
        item["name"]
        for item in items
    )


def join_slugs(
    items,
):
    return " | ".join(
        item["slug"]
        for item in items
    )

def has_hotel_priority(
    caption: str,
    location: str,
) -> bool:
    text = (
        f"{caption or ''} "
        f"{location or ''}"
    ).lower()

    text = text.replace(
        "\u200c",
        " ",
    )

    return (
        "هتل" in text
        or re.search(
            r"\bhotel\b",
            text,
        )
        is not None
    )

def instagram_post_url(
    node: dict,
) -> str:
    code = node["code"]

    if (
        node.get("product_type")
        == "clips"
    ):
        return (
            "https://www.instagram.com/"
            f"reel/{code}/"
        )

    return (
        "https://www.instagram.com/"
        f"p/{code}/"
    )


def parse_graphql_response(
    payload: dict,
):
    connection = payload["data"][
        "xdt_api__v1__feed__"
        "user_timeline_graphql_connection"
    ]

    posts = []

    for edge in connection.get(
        "edges",
        [],
    ):
        node = edge.get(
            "node",
            {},
        )

        caption_data = (
            node.get("caption")
            or {}
        )

        caption = (
            caption_data.get("text")
            or ""
        )

        location_data = (
            node.get("location")
            or {}
        )

        location = (
            location_data.get("name")
            or ""
        )

        detection = detect_locations(
            caption,
            location,
        )

        hotel_priority = (
            has_hotel_priority(
                caption,
                location,
            )
        )

        taken_at = node.get(
            "taken_at"
        )

        published_at = ""

        if taken_at:
            published_at = (
                datetime.fromtimestamp(
                    taken_at,
                    tz=timezone.utc,
                ).isoformat()
            )

        posts.append(
            {
                "username": (
                    (
                        node.get("user")
                        or {}
                    ).get(
                        "username",
                        "",
                    )
                ),
                "post_url": (
                    instagram_post_url(
                        node
                    )
                ),
                "shortcode": node.get(
                    "code",
                    "",
                ),
                "published_at": (
                    published_at
                ),
                "location": location,
                "product_type": (
                    node.get(
                        "product_type",
                        "",
                    )
                ),
                "media_type": (
                    node.get(
                        "media_type",
                        "",
                    )
                ),
                "matched_provinces": (
                    join_names(
                        detection[
                            "provinces"
                        ]
                    )
                ),
                "matched_province_slugs": (
                    join_slugs(
                        detection[
                            "provinces"
                        ]
                    )
                ),
                "matched_cities": (
                    join_names(
                        detection[
                            "cities"
                        ]
                    )
                ),
                "matched_city_slugs": (
                    join_slugs(
                        detection[
                            "cities"
                        ]
                    )
                ),
                "signal_strength": (
                    detection[
                        "signalStrength"
                    ]
                ),
                "signal_score": (
                    detection[
                        "signalScore"
                    ]
                ),
                "candidate_signals": (
                    detection[
                        "candidateSignals"
                    ]
                ),
                "is_hotel_priority": (
                    hotel_priority
                ),
                "priority": (
                    "HOTEL"
                    if hotel_priority
                    else detection[
                        "signalStrength"
                    ]
                ),
                "caption": caption,
                "is_iran_travel": (
                    detection[
                        "isIranTravel"
                    ]
                ),
            }
        )

    page_info = connection.get(
        "page_info",
        {},
    )

    return {
        "posts": posts,
        "has_next_page": (
            page_info.get(
                "has_next_page",
                False,
            )
        ),
        "end_cursor": (
            page_info.get(
                "end_cursor"
            )
        ),
    }


def collect_posts(
    profile_value: str,
    login_user: str | None = None,
    max_posts: int | None = None,
):
    if instaloader is None:
        raise RuntimeError(
            "Instaloader is not installed."
        )

    username = extract_username(
        profile_value
    )

    print(
        f"\nProfile: @{username}"
    )

    loader = create_loader(
        login_user
    )

    try:
        initial_delay = (
            random.uniform(
                8,
                15,
            )
        )

        print(
            f"Waiting "
            f"{initial_delay:.1f}s "
            "before opening profile..."
        )

        time.sleep(
            initial_delay
        )

        profile = (
            instaloader.Profile
            .from_username(
                loader.context,
                username,
            )
        )

    except (
        instaloader.exceptions
        .InstaloaderException
    ) as exc:
        print(
            f"\nCould not open "
            f"profile: {exc}"
        )
        return

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_file = (
        OUTPUT_DIR
        / (
            f"{username}"
            "-iran-travel.csv"
        )
    )

    rows = []

    scanned_count = 0
    matched_count = 0

    try:
        for post in (
            profile.get_posts()
        ):
            if (
                max_posts is not None
                and scanned_count
                >= max_posts
            ):
                break

            scanned_count += 1

            caption = (
                post.caption
                or ""
            )

            detection = (
                detect_locations(
                    caption
                )
            )

            if not detection[
                "isIranTravel"
            ]:
                continue

            matched_count += 1

            post_url = (
                "https://www.instagram.com/"
                f"p/{post.shortcode}/"
            )

            rows.append(
                {
                    "username": username,
                    "post_url": post_url,
                    "shortcode": (
                        post.shortcode
                    ),
                    "published_at": (
                        post.date_utc
                        .isoformat()
                    ),
                    "signal_strength": (
                        detection[
                            "signalStrength"
                        ]
                    ),
                    "signal_score": (
                        detection[
                            "signalScore"
                        ]
                    ),
                    "candidate_signals": (
                        " | ".join(
                            detection[
                                "candidateSignals"
                            ]
                        )
                    ),
                    "matched_provinces": (
                        join_names(
                            detection[
                                "provinces"
                            ]
                        )
                    ),
                    "matched_province_slugs": (
                        join_slugs(
                            detection[
                                "provinces"
                            ]
                        )
                    ),
                    "matched_cities": (
                        join_names(
                            detection[
                                "cities"
                            ]
                        )
                    ),
                    "matched_city_slugs": (
                        join_slugs(
                            detection[
                                "cities"
                            ]
                        )
                    ),
                    "caption": caption,
                }
            )

            delay = random.uniform(
                3,
                7,
            )

            time.sleep(delay)

    except (
        instaloader.exceptions
        .InstaloaderException
    ) as exc:
        print(
            "\nInstagram stopped "
            "the scan:"
        )
        print(exc)

    fieldnames = [
        "username",
        "post_url",
        "shortcode",
        "published_at",
        "signal_strength",
        "signal_score",
        "candidate_signals",
        "matched_provinces",
        "matched_province_slugs",
        "matched_cities",
        "matched_city_slugs",
        "caption",
    ]

    with output_file.open(
        "w",
        newline="",
        encoding="utf-8-sig",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(rows)

    print(
        "\n-----------------------------"
    )
    print(
        f"Scanned: {scanned_count}"
    )
    print(
        "Iran candidates: "
        f"{matched_count}"
    )
    print(
        f"Output: {output_file}"
    )


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Find Iran travel posts "
            "from an Instagram profile."
        )
    )

    parser.add_argument(
        "profile",
    )

    parser.add_argument(
        "--login",
    )

    parser.add_argument(
        "--max-posts",
        type=int,
    )

    args = parser.parse_args()

    collect_posts(
        profile_value=args.profile,
        login_user=args.login,
        max_posts=args.max_posts,
    )


if __name__ == "__main__":
    main()