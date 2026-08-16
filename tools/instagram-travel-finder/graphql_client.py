import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import time
from http.client import IncompleteRead


GRAPHQL_URL = "https://www.instagram.com/graphql/query"

APP_ID = "936619743392459"

FRIENDLY_NAME = (
    "PolarisProfilePostsTabContentQuery_connection"
)

ROOT_FIELD = (
    "xdt_api__v1__feed__user_timeline_graphql_connection"
)


def cookie_value(
    cookie_header: str,
    name: str,
) -> str:
    for part in cookie_header.split(";"):
        key, separator, value = (
            part.strip().partition("=")
        )

        if separator and key == name:
            return value

    return ""


def fetch_profile_page(
    username: str,
    after: str | None = None,
    count: int = 12,
) -> dict:
    cookie = os.environ.get(
        "IG_COOKIE",
        "",
    ).strip()

    doc_id = os.environ.get(
        "IG_DOC_ID",
        "",
    ).strip()

    if not cookie:
        raise RuntimeError(
            "IG_COOKIE environment variable is missing."
        )

    if not doc_id:
        raise RuntimeError(
            "IG_DOC_ID environment variable is missing."
        )

    csrf_token = cookie_value(
        cookie,
        "csrftoken",
    )

    if not csrf_token:
        raise RuntimeError(
            "csrftoken was not found in IG_COOKIE."
        )

    variables = {
        "after": after,
        "before": None,
        "data": {
            "count": count,
            "include_reel_media_seen_timestamp": True,
            "include_relationship_info": True,
            "latest_besties_reel_media": True,
            "latest_reel_media": True,
        },
        "first": count,
        "include_multi_captions": False,
        "last": None,
        "username": username,
        "__relay_internal__pv__PolarisMultiCaptionCarouselEnabledrelayprovider": False,
        "__relay_internal__pv__PolarisShortDramaEnabledrelayprovider": False,
        "__relay_internal__pv__PolarisReelsRecoDebugOverlayEnabledrelayprovider": False,
    }

    body = urlencode(
        {
            "fb_api_caller_class": "RelayModern",
            "fb_api_req_friendly_name": FRIENDLY_NAME,
            "server_timestamps": "true",
            "variables": json.dumps(
                variables,
                separators=(",", ":"),
            ),
            "doc_id": doc_id,
        }
    ).encode("utf-8")

    headers = {
        "Accept": "*/*",
        "Content-Type": (
            "application/x-www-form-urlencoded"
        ),
        "Cookie": cookie,
        "Origin": "https://www.instagram.com",
        "Referer": (
            f"https://www.instagram.com/{username}/"
        ),
        "User-Agent": (
            "Mozilla/5.0 AppleWebKit/537.36 "
            "Chrome/143 Safari/537.36"
        ),
        "X-CSRFToken": csrf_token,
        "X-IG-App-ID": APP_ID,
        "X-ASBD-ID": "359341",
        "X-FB-Friendly-Name": FRIENDLY_NAME,
        "X-Root-Field-Name": ROOT_FIELD,
    }

    request = Request(
        GRAPHQL_URL,
        data=body,
        headers=headers,
        method="POST",
    )

    try:
        response_body = None

        for attempt in range(3):
            try:
                with urlopen(
                    request,
                    timeout=30,
                ) as response:
                    try:
                        raw_body = response.read()

                    except IncompleteRead as exc:
                        raw_body = exc.partial

                        try:
                            json.loads(
                                raw_body.decode("utf-8")
                            )
                        except (
                            UnicodeDecodeError,
                            json.JSONDecodeError,
                        ):
                            raise exc

                    response_body = raw_body.decode(
                        "utf-8"
                    )
                break

            except IncompleteRead:
                if attempt == 2:
                    raise

                time.sleep(2)

    except IncompleteRead as exc:
        raise RuntimeError(
            "Instagram response was incomplete "
            "after 3 attempts."
        ) from exc

    except HTTPError as exc:
        detail = exc.read().decode(
            "utf-8",
            errors="replace",
        )

        raise RuntimeError(
            f"Instagram HTTP {exc.code}: "
            f"{detail[:500]}"
        ) from exc

    except URLError as exc:
        raise RuntimeError(
            f"Instagram request failed: {exc}"
        ) from exc

    payload = json.loads(response_body)

    if payload.get("errors"):
        raise RuntimeError(
            f"Instagram GraphQL error: "
            f"{payload['errors']}"
        )

    return payload