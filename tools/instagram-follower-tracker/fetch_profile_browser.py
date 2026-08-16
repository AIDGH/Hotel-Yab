import argparse
import asyncio
import json
import re
from pathlib import Path

from playwright.async_api import (
    async_playwright,
    TimeoutError as PlaywrightTimeoutError,
)


BASE_DIR = Path(__file__).resolve().parent

BROWSER_PROFILE_DIR = (
    BASE_DIR
    / ".browser-profile"
)

PROFILE_QUERY_NAME = (
    "PolarisProfilePageContentQuery"
)


def normalize_username(
    value: str,
) -> str:
    return (
        value.strip()
        .lstrip("@")
        .lower()
    )


def find_profile_in_json(
    value,
    username: str,
):
    if isinstance(
        value,
        dict,
    ):
        current_username = (
            str(
                value.get(
                    "username",
                    "",
                )
            )
            .strip()
            .lower()
        )

        follower_count = value.get(
            "follower_count"
        )

        if (
            current_username
            == username
            and isinstance(
                follower_count,
                int,
            )
        ):
            return {
                "username": (
                    value.get(
                        "username",
                        username,
                    )
                ),
                "full_name": (
                    value.get(
                        "full_name",
                        "",
                    )
                ),
                "follower_count": (
                    follower_count
                ),
                "instagram_id": (
                    value.get("id")
                    or value.get("pk")
                    or value.get(
                        "pk_id"
                    )
                    or ""
                ),
            }

        for child in (
            value.values()
        ):
            result = (
                find_profile_in_json(
                    child,
                    username,
                )
            )

            if result:
                return result

    elif isinstance(
        value,
        list,
    ):
        for child in value:
            result = (
                find_profile_in_json(
                    child,
                    username,
                )
            )

            if result:
                return result

    return None


def parse_profile_response(
    text: str,
    username: str,
):
    cleaned = text.strip()

    if cleaned.startswith(
        "for (;;);"
    ):
        cleaned = cleaned[
            len("for (;;);"):
        ]

    try:
        payload = json.loads(
            cleaned
        )

        result = (
            find_profile_in_json(
                payload,
                username,
            )
        )

        if result:
            return result

    except json.JSONDecodeError:
        pass

    escaped_username = (
        re.escape(
            username
        )
    )

    username_matches = list(
        re.finditer(
            (
                r'"username"\s*:\s*"'
                + escaped_username
                + r'"'
            ),
            text,
            flags=re.IGNORECASE,
        )
    )

    follower_matches = list(
        re.finditer(
            (
                r'"follower_count"'
                r"\s*:\s*(\d+)"
            ),
            text,
        )
    )

    if not follower_matches:
        return None

    selected = None

    if username_matches:
        best_distance = None

        for username_match in (
            username_matches
        ):
            for follower_match in (
                follower_matches
            ):
                distance = abs(
                    username_match.start()
                    - follower_match.start()
                )

                if (
                    best_distance is None
                    or distance
                    < best_distance
                ):
                    best_distance = (
                        distance
                    )

                    selected = (
                        follower_match
                    )

    elif len(
        follower_matches
    ) == 1:
        selected = (
            follower_matches[0]
        )

    if selected is None:
        return None

    return {
        "username": username,
        "full_name": "",
        "follower_count": int(
            selected.group(1)
        ),
        "instagram_id": "",
    }


async def login():
    BROWSER_PROFILE_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    async with (
        async_playwright()
        as playwright
    ):
        context = (
            await playwright.chromium
            .launch_persistent_context(
                user_data_dir=str(
                    BROWSER_PROFILE_DIR
                ),
                headless=False,
            )
        )

        page = (
            context.pages[0]
            if context.pages
            else await context.new_page()
        )

        await page.goto(
            "https://www.instagram.com/",
            wait_until=(
                "domcontentloaded"
            ),
        )

        print()
        print(
            "Instagram browser opened."
        )
        print(
            "Login with the test account."
        )
        print(
            "After the home page loads,"
        )

        await asyncio.to_thread(
            input,
            (
                "press Enter here "
                "to save the session..."
            ),
        )

        await context.close()

        print()
        print(
            "Instagram session saved."
        )


async def fetch_profile(
    username: str,
    headless: bool,
):
    username = normalize_username(
        username
    )

    BROWSER_PROFILE_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    async with (
        async_playwright()
        as playwright
    ):
        context = (
            await playwright.chromium
            .launch_persistent_context(
                user_data_dir=str(
                    BROWSER_PROFILE_DIR
                ),
                headless=headless,
            )
        )

        page = (
            context.pages[0]
            if context.pages
            else await context.new_page()
        )

        loop = (
            asyncio.get_running_loop()
        )

        result_future = (
            loop.create_future()
        )

        async def handle_response(
            response,
        ):
            if (
                result_future.done()
            ):
                return

            if (
                "/api/graphql"
                not in response.url
            ):
                return

            request = (
                response.request
            )

            post_data = (
                request.post_data
                or ""
            )

            request_headers = (
                await request.all_headers()
            )

            friendly_name = (
                request_headers.get(
                    "x-fb-friendly-name",
                    "",
                )
            )

            if (
                PROFILE_QUERY_NAME
                not in post_data
                and friendly_name
                != PROFILE_QUERY_NAME
            ):
                return

            try:
                text = (
                    await response.text()
                )

            except Exception:
                return

            profile = (
                parse_profile_response(
                    text,
                    username,
                )
            )

            if (
                profile
                and not result_future.done()
            ):
                result_future.set_result(
                    profile
                )

        def response_listener(
            response,
        ):
            asyncio.create_task(
                handle_response(
                    response
                )
            )

        page.on(
            "response",
            response_listener,
        )

        profile_url = (
            "https://www.instagram.com/"
            f"{username}/"
        )

        print()
        print(
            f"Opening @{username}..."
        )

        try:
            await page.goto(
                profile_url,
                wait_until=(
                    "domcontentloaded"
                ),
                timeout=30_000,
            )

        except (
            PlaywrightTimeoutError
        ):
            pass

        await page.wait_for_timeout(
            2_000
        )

        if (
            "/accounts/login"
            in page.url
        ):
            await context.close()

            raise RuntimeError(
                (
                    "Instagram session "
                    "is not logged in. "
                    "Run with --login first."
                )
            )

        try:
            profile = (
                await asyncio.wait_for(
                    result_future,
                    timeout=20,
                )
            )

        except asyncio.TimeoutError:
            print(
                (
                    "Profile query was not "
                    "captured. Reloading once..."
                )
            )

            result_future = (
                loop.create_future()
            )

            try:
                await page.reload(
                    wait_until=(
                        "domcontentloaded"
                    ),
                    timeout=30_000,
                )

            except (
                PlaywrightTimeoutError
            ):
                pass

            try:
                profile = (
                    await asyncio.wait_for(
                        result_future,
                        timeout=20,
                    )
                )

            except asyncio.TimeoutError:
                await context.close()

                raise RuntimeError(
                    (
                        "Could not capture "
                        "PolarisProfilePageContentQuery."
                    )
                )

        await context.close()

        return profile


def print_profile(
    profile: dict,
):
    print()
    print(
        "Instagram profile"
    )

    print(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )

    print(
        "Username :",
        profile.get(
            "username",
            "",
        )
        or "—",
    )

    print(
        "Name     :",
        profile.get(
            "full_name",
            "",
        )
        or "—",
    )

    print(
        "IG ID    :",
        profile.get(
            "instagram_id",
            "",
        )
        or "—",
    )

    print(
        "Followers:",
        (
            f"{profile['follower_count']:,}"
        ),
    )

    print(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )


async def run():
    parser = (
        argparse.ArgumentParser(
            description=(
                "Read Instagram "
                "follower count using "
                "a persistent browser session."
            )
        )
    )

    parser.add_argument(
        "username",
        nargs="?",
        help=(
            "Instagram username"
        ),
    )

    parser.add_argument(
        "--login",
        action="store_true",
        help=(
            "Open Instagram and "
            "save login session"
        ),
    )

    parser.add_argument(
        "--headless",
        action="store_true",
        help=(
            "Run browser without "
            "visible UI"
        ),
    )

    args = parser.parse_args()

    if args.login:
        await login()
        return

    if not args.username:
        parser.error(
            (
                "username is required "
                "unless --login is used"
            )
        )

    profile = await fetch_profile(
        args.username,
        args.headless,
    )

    print_profile(
        profile
    )


def main():
    asyncio.run(
        run()
    )


if __name__ == "__main__":
    main()