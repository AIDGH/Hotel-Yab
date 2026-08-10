import argparse
import csv
import re
from pathlib import Path

import instaloader

import random
import time

from detector import detect_locations


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"


def extract_username(value: str) -> str:
    value = value.strip()

    value = re.sub(
        r"^https?://(www\.)?instagram\.com/",
        "",
        value,
        flags=re.IGNORECASE,
    )

    value = value.split("?")[0]
    value = value.strip("/")

    if value.startswith("@"):
        value = value[1:]

    # اگر اشتباهی URL پست داده شد
    if "/" in value:
        value = value.split("/")[0]

    if not value:
        raise ValueError("Instagram username could not be detected.")

    return value


def create_loader(login_user: str | None):
    loader = instaloader.Instaloader(
        max_connection_attempts=1,
    )

    if not login_user:
        return loader

    try:
        print(f"Loading Instagram session for @{login_user}...")
        loader.load_session_from_file(login_user)

    except FileNotFoundError:
        print("Saved session not found.")
        print("Instagram login is required.")

        loader.interactive_login(login_user)
        loader.save_session_to_file()

    return loader


def join_names(items):
    return " | ".join(item["name"] for item in items)


def join_slugs(items):
    return " | ".join(item["slug"] for item in items)


def collect_posts(
    profile_value: str,
    login_user: str | None = None,
    max_posts: int | None = None,
):
    username = extract_username(profile_value)

    print(f"\nProfile: @{username}")

    loader = create_loader(login_user)

    try:
        initial_delay = random.uniform(8, 15)

        print(
            f"Waiting {initial_delay:.1f}s "
            "before opening profile..."
        )

        time.sleep(initial_delay)
        profile = instaloader.Profile.from_username(
            loader.context,
            username,
        )

    except instaloader.exceptions.InstaloaderException as exc:
        print(f"\nCould not open profile: {exc}")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output_file = OUTPUT_DIR / f"{username}-iran-travel.csv"

    rows = []

    scanned_count = 0
    matched_count = 0

    print("\nScanning posts...\n")

    try:
        for post in profile.get_posts():
            if max_posts is not None and scanned_count >= max_posts:
                break

            scanned_count += 1

            caption = post.caption or ""

            detection = detect_locations(caption)

            status = (
                "MATCH"
                if detection["isIranTravel"]
                else "skip"
            )

            print(
                f"[{scanned_count}] "
                f"{post.shortcode} → {status}"
            )

            if not detection["isIranTravel"]:
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
                    "shortcode": post.shortcode,
                    "published_at": (
                        post.date_utc.isoformat()
                    ),
                    "matched_provinces": join_names(
                        detection["provinces"]
                    ),
                    "matched_province_slugs": join_slugs(
                        detection["provinces"]
                    ),
                    "matched_cities": join_names(
                        detection["cities"]
                    ),
                    "matched_city_slugs": join_slugs(
                        detection["cities"]
                    ),
                    "caption": caption,
                }
            )
            delay = random.uniform(3, 7)
            print(f"Waiting {delay:.1f}s...")
            time.sleep(delay)

    except instaloader.exceptions.InstaloaderException as exc:
        print("\nInstagram stopped the scan:")
        print(exc)

    fieldnames = [
        "username",
        "post_url",
        "shortcode",
        "published_at",
        "matched_provinces",
        "matched_province_slugs",
        "matched_cities",
        "matched_city_slugs",
        "caption",
    ]

    with open(
        output_file,
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

    print("\n-----------------------------")
    print(f"Scanned: {scanned_count}")
    print(f"Iran travel matches: {matched_count}")
    print(f"Output: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Find Iran travel posts from an "
            "Instagram profile."
        )
    )

    parser.add_argument(
        "profile",
        help=(
            "Instagram username or profile URL"
        ),
    )

    parser.add_argument(
        "--login",
        help=(
            "Instagram username used for "
            "authenticated session"
        ),
    )

    parser.add_argument(
        "--max-posts",
        type=int,
        help=(
            "Only scan the first N posts "
            "for testing"
        ),
    )

    args = parser.parse_args()

    collect_posts(
        profile_value=args.profile,
        login_user=args.login,
        max_posts=args.max_posts,
    )


if __name__ == "__main__":
    main()

'''
python3 tools/instagram-travel-finder/collector.py \
"https://www.instagram.com/morteza.kowsari/" \
--login arad.i.d \
--max-posts 5
'''
