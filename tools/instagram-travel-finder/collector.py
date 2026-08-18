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

PERSIAN_ACCOMMODATION_TERMS = (
    "هتل",
    "اقامتگاه",
    "اقامت گاه",
    "اقامت",
    "بومگردی",
    "بوم گردی",
    "خانه بومگردی",
    "خانه بومی",
    "مهمانسرا",
    "مهمان سرا",
    "مهمانپذیر",
    "مهمان پذیر",
    "مهمانخانه",
    "مهمان خانه",
    "مسافرخانه",
    "مسافر خانه",
    "خانه مسافر",
    "زائرسرا",
    "زائر سرا",
    "کاروانسرا",
    "کاروان سرا",
    "هاستل",
    "متل",
    "ریزورت",
    "لژ",
    "کلبه",
    "سوئیت",
    "ویلا",
    "بنگالو",
    "شاله",
    "کمپ اقامتی",
    "کمپینگ",
    "مجتمع اقامتی",
    "دهکده اقامتی",
    "سرای اقامتی",
    "شب مانی",
    "شبمانی",
)

ENGLISH_ACCOMMODATION_PATTERNS = (
    r"\bhotels?\b",
    r"\bhostels?\b",
    r"\bmotels?\b",
    r"\bresorts?\b",
    r"\blodges?\b",
    r"\blodging\b",
    r"\binns?\b",
    r"\bguest\s*houses?\b",
    r"\bhomestays?\b",
    r"\bcaravan\s*serais?\b",
    r"\bcaravanserais?\b",
    r"\beco[ -]?lodges?\b",
    r"\bbed\s*(?:and|&)\s*breakfast\b",
    r"\bb\s*&\s*b\b",
    r"\baparthotels?\b",
    r"\bapartment\s+hotels?\b",
    r"\bserviced\s+apartments?\b",
    r"\bvacation\s+rentals?\b",
    r"\bholiday\s+(?:homes?|rentals?)\b",
    r"\bholiday\s+cottages?\b",
    r"\bcottages?\b",
    r"\bbungalows?\b",
    r"\bchalets?\b",
    r"\bcabins?\b",
    r"\bvillas?\b",
    r"\bsuites?\b",
    r"\bcampsites?\b",
    r"\bcampgrounds?\b",
    r"\bglamping\b",
    r"\baccommodations?\b",
    r"\bovernight\s+stays?\b",
    r"\bguest\s+rooms?\b",
    r"\bairbnb\b",
)


def normalize_accommodation_text(
    value: str,
) -> str:
    text = (value or "").lower()

    text = text.translate(
        str.maketrans(
            {
                "ي": "ی",
                "ى": "ی",
                "ك": "ک",
                "ۀ": "ه",
                "ة": "ه",
                "ؤ": "و",
                "إ": "ا",
                "أ": "ا",
            }
        )
    )

    text = re.sub(
        r"[\u064b-\u065f\u0670]",
        "",
        text,
    )

    text = re.sub(
        r"[\u200c\u200d\ufeff]",
        " ",
        text,
    )

    return re.sub(
        r"\s+",
        " ",
        text,
    ).strip()


def has_hotel_priority(
    caption: str,
    location: str,
) -> bool:
    text = normalize_accommodation_text(
        f"{caption or ''} {location or ''}"
    )

    if any(
        term in text
        for term in PERSIAN_ACCOMMODATION_TERMS
    ):
        return True

    return any(
        re.search(pattern, text)
        is not None
        for pattern in ENGLISH_ACCOMMODATION_PATTERNS
    )


def best_media_candidate(
    candidates,
) -> dict:
    valid = [
        item
        for item in (
            candidates or []
        )
        if isinstance(
            item,
            dict,
        )
        and item.get(
            "url"
        )
    ]

    if not valid:
        return {}

    return max(
        valid,
        key=lambda item: (
            int(
                item.get(
                    "width"
                )
                or 0
            )
            * int(
                item.get(
                    "height"
                )
                or 0
            )
        ),
    )


def extract_media_metadata(
    node: dict,
) -> dict:
    video = best_media_candidate(
        node.get(
            "video_versions"
        )
    )

    image_versions = (
        node.get(
            "image_versions2"
        )
        or {}
    )

    thumbnail = (
        best_media_candidate(
            image_versions.get(
                "candidates"
            )
        )
    )

    return {
        "video_download_url": (
            video.get(
                "url",
                "",
            )
        ),
        "video_width": (
            video.get(
                "width"
            )
        ),
        "video_height": (
            video.get(
                "height"
            )
        ),
        "thumbnail_source_url": (
            thumbnail.get(
                "url",
                "",
            )
        ),
        "thumbnail_width": (
            thumbnail.get(
                "width"
            )
        ),
        "thumbnail_height": (
            thumbnail.get(
                "height"
            )
        ),
    }

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


def resolve_graphql_connection(
    payload: dict,
) -> dict:
    data = payload.get(
        "data"
    ) or {}

    connection_keys = [
        (
            "xdt_api__v1__feed__"
            "user_timeline_graphql_connection"
        ),
        (
            "xdt_api__v1__clips__"
            "user__connection_v2"
        ),
    ]

    for key in connection_keys:
        connection = data.get(
            key
        )

        if isinstance(
            connection,
            dict,
        ):
            return connection

    raise RuntimeError(
        "Unsupported Instagram GraphQL response. "
        "No supported profile media connection was found."
    )


def parse_graphql_response(
    payload: dict,
):
    connection = (
        resolve_graphql_connection(
            payload
        )
    )

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

        media_metadata = (
            extract_media_metadata(
                node
            )
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
                "video_download_url": (
                    media_metadata[
                        "video_download_url"
                    ]
                ),
                "video_width": (
                    media_metadata[
                        "video_width"
                    ]
                ),
                "video_height": (
                    media_metadata[
                        "video_height"
                    ]
                ),
                "thumbnail_source_url": (
                    media_metadata[
                        "thumbnail_source_url"
                    ]
                ),
                "thumbnail_width": (
                    media_metadata[
                        "thumbnail_width"
                    ]
                ),
                "thumbnail_height": (
                    media_metadata[
                        "thumbnail_height"
                    ]
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