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
    *,
    browser: str | None = None,
    cookie_file: str | None = None,
    interactive_login: bool = True,
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

    if browser:
        try:
            import browser_cookie3
        except ImportError as exc:
            raise RuntimeError(
                "Reading an Instagram session from a browser requires "
                "browser-cookie3. Install it with: "
                "python3 -m pip install browser-cookie3"
            ) from exc

        supported_browsers = {
            "brave": browser_cookie3.brave,
            "chrome": browser_cookie3.chrome,
            "chromium": browser_cookie3.chromium,
            "edge": browser_cookie3.edge,
            "firefox": browser_cookie3.firefox,
            "librewolf": browser_cookie3.librewolf,
            "opera": browser_cookie3.opera,
            "opera_gx": browser_cookie3.opera_gx,
            "safari": browser_cookie3.safari,
            "vivaldi": browser_cookie3.vivaldi,
        }
        browser_name = browser.lower()
        browser_reader = supported_browsers.get(browser_name)
        if browser_reader is None:
            choices = ", ".join(sorted(supported_browsers))
            raise RuntimeError(
                f"Unsupported browser '{browser}'. Choose one of: {choices}"
            )

        print(
            "Loading Instagram session "
            f"from {browser_name}..."
        )
        try:
            browser_cookies = browser_reader(
                cookie_file=cookie_file
            )
        except Exception as exc:
            raise RuntimeError(
                f"Could not read {browser_name} cookies. Make sure Instagram "
                "is logged in in that browser and allow any macOS Keychain "
                f"prompt. Detail: {exc}"
            ) from exc

        cookies = {
            cookie.name: cookie.value
            for cookie in browser_cookies
            if "instagram.com" in cookie.domain
        }
        if not cookies:
            raise RuntimeError(
                f"No Instagram cookies were found in {browser_name}. "
                "Log in to instagram.com in that browser first."
            )

        loader.context.update_cookies(cookies)
        detected_username = loader.test_login()
        if not detected_username:
            raise RuntimeError(
                f"The Instagram session found in {browser_name} is not valid. "
                "Open instagram.com in that browser, log in, and retry."
            )
        loader.context.username = detected_username
        loader.save_session_to_file()
        print(
            "Instagram session imported for "
            f"@{detected_username}."
        )
        return loader

    if not login_user:
        return loader

    if login_user.upper() == "YOUR_INSTAGRAM_USERNAME":
        raise RuntimeError(
            "YOUR_INSTAGRAM_USERNAME is only an example placeholder. "
            "Use your real username or use --load-cookies chrome."
        )

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

        if not interactive_login:
            raise RuntimeError(
                f"No saved Instaloader session exists for @{login_user}. "
                "Log in to instagram.com in Chrome and run once with "
                "--load-cookies chrome."
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


def extract_media_item(
    node: dict,
    display_order: int,
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

    media_type = (
        "VIDEO"
        if video.get("url")
        or node.get("media_type") in (2, "2")
        else "IMAGE"
    )

    return {
        "display_order": display_order,
        "media_type": media_type,
        "download_url": (
            video.get("url", "")
            if media_type == "VIDEO"
            else thumbnail.get("url", "")
        ),
        "thumbnail_source_url": (
            thumbnail.get("url", "")
        ),
        "width": (
            video.get("width")
            if media_type == "VIDEO"
            else thumbnail.get("width")
        ),
        "height": (
            video.get("height")
            if media_type == "VIDEO"
            else thumbnail.get("height")
        ),
    }


def extract_media_metadata(
    node: dict,
) -> dict:
    carousel_media = node.get(
        "carousel_media"
    )

    source_items = (
        carousel_media
        if isinstance(carousel_media, list)
        and carousel_media
        else [node]
    )

    media_items = [
        extract_media_item(item, index)
        for index, item in enumerate(
            source_items,
            start=1,
        )
        if isinstance(item, dict)
    ]

    primary = (
        media_items[0]
        if media_items
        else {}
    )

    return {
        "video_download_url": (
            primary.get("download_url", "")
            if primary.get("media_type")
            == "VIDEO"
            else ""
        ),
        "video_width": (
            primary.get("width")
            if primary.get("media_type")
            == "VIDEO"
            else None
        ),
        "video_height": (
            primary.get("height")
            if primary.get("media_type")
            == "VIDEO"
            else None
        ),
        "thumbnail_source_url": (
            primary.get(
                "thumbnail_source_url",
                "",
            )
        ),
        "thumbnail_width": (
            primary.get("width")
        ),
        "thumbnail_height": (
            primary.get("height")
        ),
        "media_items": media_items,
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
    data = payload.get("data")
    if not isinstance(data, dict):
        status = payload.get("status")
        label = (
            status
            if isinstance(status, str) and status in {"ok", "fail"}
            else "unknown"
        )
        keys = ", ".join(sorted(str(key)[:80] for key in payload)[:8])
        error_code = payload.get("error")
        code = str(error_code) if type(error_code) is int else "unknown"
        raise RuntimeError(
            "Instagram returned no GraphQL data "
            f"(status: {label}; error code: {code}; root keys: {keys})."
        )

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

        if isinstance(connection, dict) and isinstance(
            connection.get("edges"), list
        ):
            return connection

    for key, connection in data.items():
        if (
            key.startswith("xdt_api__v1__")
            and ("user_timeline" in key or "clips__user" in key)
            and isinstance(connection, dict)
            and isinstance(connection.get("edges"), list)
            and isinstance(connection.get("page_info"), dict)
        ):
            return connection

    keys = ", ".join(sorted(str(key)[:80] for key in data)[:6]) or "none"
    status = payload.get("status")
    label = (
        status
        if isinstance(status, str) and status in {"ok", "fail"}
        else "unknown"
    )

    raise RuntimeError(
        "Unsupported Instagram GraphQL response. "
        "No supported profile media connection was found "
        f"(status: {label}; data keys: {keys})."
    )

def classify_content(
    node: dict,
) -> tuple[str, int]:
    product_type = str(
        node.get("product_type", "")
    ).lower()

    media_type = node.get(
        "media_type"
    )

    if product_type == "clips":
        return "REEL", 30

    if media_type in (2, "2"):
        return "VIDEO_POST", 20

    if (
        product_type
        == "carousel_container"
        or media_type in (8, "8")
    ):
        return "CAROUSEL", 5

    return "POST", 0

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

        content_type, content_bonus = (
            classify_content(node)
        )

        ranking_score = (
            detection["signalScore"]
            + content_bonus
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
                "media_items": (
                    media_metadata[
                        "media_items"
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
                "content_type": content_type,
                "content_bonus": content_bonus,
                "ranking_score": ranking_score,
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
