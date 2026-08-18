import argparse
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from playwright.async_api import (
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)

from fetch_profile_browser import (
    BROWSER_PROFILE_DIR,
    PROFILE_QUERY_NAME,
    normalize_username,
    parse_profile_response,
)


BASE_DIR = Path(__file__).resolve().parent

OUTPUT_DIR = (
    BASE_DIR
    / "output"
)

API_BASE = os.getenv(
    "HOTELYAB_API_BASE",
    "http://localhost:4000/api/v1",
).rstrip("/")

ADMIN_COOKIE = os.getenv(
    "HOTELYAB_ADMIN_COOKIE",
    "",
)


class Color:
    RESET = "\033[0m"
    BOLD = "\033[1m"

    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    GRAY = "\033[90m"


def color(
    text,
    value,
):
    return (
        f"{value}{text}"
        f"{Color.RESET}"
    )

def api_post_json(
    path: str,
    payload: dict,
):
    if not ADMIN_COOKIE:
        raise RuntimeError(
            "HOTELYAB_ADMIN_COOKIE is not set."
        )

    body = json.dumps(
        payload
    ).encode(
        "utf-8"
    )

    request = Request(
        f"{API_BASE}{path}",
        data=body,
        method="POST",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Cookie": ADMIN_COOKIE,
        },
    )

    try:
        with urlopen(
            request,
            timeout=60,
        ) as response:
            return json.loads(
                response
                .read()
                .decode("utf-8")
            )

    except HTTPError as exc:
        response_body = (
            exc.read()
            .decode(
                "utf-8",
                errors="replace",
            )
        )

        raise RuntimeError(
            (
                "Hotel-Yab API "
                f"HTTP {exc.code}: "
                f"{response_body[:1000]}"
            )
        ) from exc

    except URLError as exc:
        raise RuntimeError(
            (
                "Could not connect "
                "to Hotel-Yab API: "
                f"{exc}"
            )
        ) from exc
    
def api_get_json(
    path: str,
):
    if not ADMIN_COOKIE:
        raise RuntimeError(
            "HOTELYAB_ADMIN_COOKIE "
            "is not set."
        )

    request = Request(
        f"{API_BASE}{path}",
        headers={
            "Accept": (
                "application/json"
            ),
            "Cookie": ADMIN_COOKIE,
        },
    )

    try:
        with urlopen(
            request,
            timeout=30,
        ) as response:
            return json.loads(
                response
                .read()
                .decode("utf-8")
            )

    except HTTPError as exc:
        body = (
            exc.read()
            .decode(
                "utf-8",
                errors="replace",
            )
        )

        raise RuntimeError(
            (
                "Hotel-Yab API "
                f"HTTP {exc.code}: "
                f"{body[:500]}"
            )
        ) from exc

    except URLError as exc:
        raise RuntimeError(
            (
                "Could not connect "
                "to Hotel-Yab API: "
                f"{exc}"
            )
        ) from exc


def looks_like_people(
    value,
) -> bool:
    if not isinstance(
        value,
        list,
    ):
        return False

    for item in value:
        if not isinstance(
            item,
            dict,
        ):
            continue

        if (
            "instagramHandle"
            in item
            or "instagram_handle"
            in item
        ):
            return True

    return False


def find_people_collection(
    value,
):
    if isinstance(
        value,
        dict,
    ):
        preferred_keys = [
            "notablePeople",
            "notable_people",
            "people",
        ]

        for key in preferred_keys:
            candidate = value.get(
                key
            )

            if looks_like_people(
                candidate
            ):
                return candidate

        for child in (
            value.values()
        ):
            result = (
                find_people_collection(
                    child
                )
            )

            if result is not None:
                return result

    elif isinstance(
        value,
        list,
    ):
        if looks_like_people(
            value
        ):
            return value

        for child in value:
            result = (
                find_people_collection(
                    child
                )
            )

            if result is not None:
                return result

    return None


def get_instagram_handle(
    person: dict,
) -> str:
    return normalize_username(
        str(
            person.get(
                "instagramHandle",
                "",
            )
            or person.get(
                "instagram_handle",
                "",
            )
            or ""
        )
    )


def get_display_name(
    person: dict,
) -> str:
    return str(
        person.get(
            "displayName",
            "",
        )
        or person.get(
            "display_name",
            "",
        )
        or ""
    ).strip()


def load_people():
    payload = api_get_json(
        "/admin/catalog/bootstrap"
    )

    people = (
        find_people_collection(
            payload
        )
    )

    if people is None:
        raise RuntimeError(
            (
                "Could not find "
                "NotablePerson records "
                "in bootstrap response."
            )
        )

    result = []
    seen = set()

    for person in people:
        handle = (
            get_instagram_handle(
                person
            )
        )

        if not handle:
            continue

        if handle in seen:
            continue

        seen.add(
            handle
        )

        result.append(
            {
                "id": str(
                    person.get(
                        "id",
                        "",
                    )
                    or ""
                ),
                "displayName": (
                    get_display_name(
                        person
                    )
                ),
                "instagramHandle": (
                    handle
                ),
                "oldFollowerCount": (
                    person.get(
                        "followerCount"
                    )
                ),
            }
        )

    return result


async def track_people(
    people: list[dict],
    headless: bool,
    delay: float,
):
    BROWSER_PROFILE_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    results = []

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

        state = {
            "username": None,
            "future": None,
        }

        async def handle_response(
            response,
        ):
            future = state[
                "future"
            ]

            username = state[
                "username"
            ]

            if (
                future is None
                or future.done()
                or not username
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

            try:
                headers = (
                    await request.all_headers()
                )
            except Exception:
                return

            friendly_name = (
                headers.get(
                    "x-fb-friendly-name",
                    "",
                )
            )

            post_data = (
                request.post_data
                or ""
            )

            if (
                friendly_name
                != PROFILE_QUERY_NAME
                and PROFILE_QUERY_NAME
                not in post_data
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
                and not future.done()
            ):
                future.set_result(
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

        total = len(
            people
        )

        for index, person in enumerate(
            people,
            start=1,
        ):
            username = person[
                "instagramHandle"
            ]

            display_name = (
                person[
                    "displayName"
                ]
            )

            print()

            print(
                color(
                    (
                        f"[{index}/{total}] "
                        f"@{username}"
                    ),
                    Color.CYAN
                    + Color.BOLD,
                )
            )

            if display_name:
                print(
                    color(
                        display_name,
                        Color.GRAY,
                    )
                )

            future = (
                loop.create_future()
            )

            state[
                "username"
            ] = username

            state[
                "future"
            ] = future

            profile_url = (
                "https://www.instagram.com/"
                f"{username}/"
            )

            started_at = (
                datetime.now(
                    timezone.utc
                )
            )

            try:
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
                    1_000
                )

                if (
                    "/accounts/login"
                    in page.url
                ):
                    raise RuntimeError(
                        (
                            "Instagram session "
                            "is logged out. "
                            "Run --login again."
                        )
                    )

                try:
                    profile = (
                        await asyncio.wait_for(
                            future,
                            timeout=20,
                        )
                    )

                except asyncio.TimeoutError:
                    profile = None

                if profile:
                    follower_count = (
                        profile[
                            "follower_count"
                        ]
                    )

                    print(
                        color(
                            (
                                "✅ "
                                f"{follower_count:,} "
                                "followers"
                            ),
                            Color.GREEN
                            + Color.BOLD,
                        )
                    )

                    old_count = (
                        person[
                            "oldFollowerCount"
                        ]
                    )

                    if isinstance(
                        old_count,
                        int,
                    ):
                        difference = (
                            follower_count
                            - old_count
                        )

                        if difference:
                            sign = (
                                "+"
                                if difference > 0
                                else ""
                            )

                            print(
                                color(
                                    (
                                        "DB difference: "
                                        f"{sign}"
                                        f"{difference:,}"
                                    ),
                                    Color.GRAY,
                                )
                            )

                    results.append(
                        {
                            **person,
                            "status": (
                                "success"
                            ),
                            "followerCount": (
                                follower_count
                            ),
                            "instagramId": (
                                profile.get(
                                    "instagram_id",
                                    "",
                                )
                            ),
                            "checkedAt": (
                                started_at.isoformat()
                            ),
                            "error": "",
                        }
                    )

                else:
                    print(
                        color(
                            (
                                "❌ follower_count "
                                "not captured"
                            ),
                            Color.RED,
                        )
                    )

                    results.append(
                        {
                            **person,
                            "status": (
                                "failed"
                            ),
                            "followerCount": (
                                None
                            ),
                            "instagramId": "",
                            "checkedAt": (
                                started_at.isoformat()
                            ),
                            "error": (
                                "Profile GraphQL "
                                "response not captured"
                            ),
                        }
                    )

            except RuntimeError:
                await context.close()
                raise

            except Exception as exc:
                print(
                    color(
                        f"❌ {exc}",
                        Color.RED,
                    )
                )

                results.append(
                    {
                        **person,
                        "status": (
                            "failed"
                        ),
                        "followerCount": (
                            None
                        ),
                        "instagramId": "",
                        "checkedAt": (
                            started_at.isoformat()
                        ),
                        "error": str(
                            exc
                        ),
                    }
                )

            state[
                "future"
            ] = None

            state[
                "username"
            ] = None

            if (
                index < total
                and delay > 0
            ):
                await asyncio.sleep(
                    delay
                )

        await context.close()

    return results


def save_results(
    results: list[dict],
):
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    timestamp = (
        datetime.now(
            timezone.utc
        )
        .strftime(
            "%Y%m%d-%H%M%S"
        )
    )

    output_path = (
        OUTPUT_DIR
        / (
            "follower-scan-"
            f"{timestamp}.json"
        )
    )

    payload = {
        "generatedAt": (
            datetime.now(
                timezone.utc
            )
            .isoformat()
        ),
        "results": results,
    }

    with output_path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            payload,
            file,
            ensure_ascii=False,
            indent=2,
        )

    return output_path


async def run():
    parser = argparse.ArgumentParser(
        description=(
            "Read follower counts "
            "for all Hotel-Yab "
            "NotablePerson records."
        )
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help=(
            "Only scan the first "
            "N people"
        ),
    )

    parser.add_argument(
        "--delay",
        type=float,
        default=5.0,
        help=(
            "Seconds between profiles"
        ),
    )

    parser.add_argument(
        "--headless",
        action="store_true",
    )

    parser.add_argument(
        "--apply",
        action="store_true",
        help=(
            "Save successful follower "
            "counts to Hotel-Yab"
        ),
    )

    args = parser.parse_args()

    people = load_people()

    if args.limit is not None:
        people = people[
            :max(
                args.limit,
                0,
            )
        ]

    print()
    print(
        color(
            (
                "Instagram Follower "
                "Bulk Scan"
            ),
            Color.BOLD,
        )
    )

    print(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )

    print(
        "People:",
        len(
            people
        ),
    )

    print(
        "Mode  : READ ONLY"
    )

    print(
        "Delay :",
        f"{args.delay}s",
    )

    print(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )

    results = await track_people(
        people,
        headless=args.headless,
        delay=args.delay,
    )

    output_path = save_results(
        results
    )

    applied = None

    if args.apply:
        successful_results = [
            item
            for item in results
            if (
                item["status"] == "success"
                and item["followerCount"] is not None
                and item["id"]
            )
        ]

        if successful_results:
            payload = {
                "updates": [
                    {
                        "notablePersonId": item["id"],
                        "followerCount": item["followerCount"],
                        "capturedAt": item["checkedAt"],
                    }
                    for item in successful_results
                ]
            }

            applied = api_post_json(
                "/admin/catalog/followers",
                payload,
            )

    success = sum(
        item["status"]
        == "success"
        for item in results
    )

    failed = sum(
        item["status"]
        == "failed"
        for item in results
    )

    print()
    print(
        color(
            "════════ SUMMARY ════════",
            Color.BOLD,
        )
    )

    print(
        color(
            f"✅ Success : {success}",
            Color.GREEN,
        )
    )

    print(
        color(
            f"❌ Failed  : {failed}",
            (
                Color.RED
                if failed
                else Color.GRAY
            ),
        )
    )

    print(
        f"Total     : {len(results)}"
    )

    print()
    print(
        "Result file:"
    )

    print(
        output_path
    )
    if args.apply:
        applied_data = (
            applied.get("data", {})
            if applied
            else {}
        )

        print()
        print(
            color(
                (
                    "💾 Applied : "
                    f"{applied_data.get('updatedPeople', 0)}"
                ),
                Color.GREEN,
            )
        )
    print()
    if not args.apply:
        print()
        print(
            color(
                (
                    "No Hotel-Yab database "
                    "changes were made."
                ),
                Color.GRAY,
            )
        )


def main():
    asyncio.run(
        run()
    )


if __name__ == "__main__":
    main()