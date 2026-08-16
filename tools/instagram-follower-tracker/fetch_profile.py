import json
import os
import re
import sys
import time
from http.client import IncompleteRead
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


GRAPHQL_URL = "https://www.instagram.com/api/graphql"
APP_ID = "936619743392459"

DOC_ID = os.getenv(
    "IG_PROFILE_DOC_ID",
    "38611279431804694",
)

COOKIE = os.getenv(
    "IG_COOKIE",
    "",
)

LSD = os.getenv(
    "IG_PROFILE_LSD",
    "",
)

FB_DTSG = os.getenv(
    "IG_FB_DTSG",
    "",
)

JAZOEST = os.getenv(
    "IG_JAZOEST",
    "",
)

AV = os.getenv(
    "IG_AV",
    "",
)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/139.0.0.0 Safari/537.36"
)

MAX_ATTEMPTS = 3


def decode_json_string(
    value: str,
) -> str:
    try:
        return json.loads(
            f'"{value}"'
        )
    except json.JSONDecodeError:
        return value


def extract_string_field(
    text: str,
    field: str,
) -> str:
    pattern = (
        rf'"{re.escape(field)}"'
        rf'\s*:\s*"'
        rf'((?:\\.|[^"\\])*)"'
    )

    match = re.search(
        pattern,
        text,
    )

    if not match:
        return ""

    return decode_json_string(
        match.group(1)
    )


def extract_profile_from_text(
    text: str,
    profile_id: str,
):
    if not text:
        return None

    if text.lstrip().lower().startswith(
        "<!doctype html"
    ):
        return None

    markers = [
        f'"id":"{profile_id}"',
        f'"pk":"{profile_id}"',
        f'"pk_id":"{profile_id}"',
    ]

    marker_positions = []

    for marker in markers:
        start = 0

        while True:
            position = text.find(
                marker,
                start,
            )

            if position == -1:
                break

            marker_positions.append(
                position
            )

            start = (
                position
                + len(marker)
            )

    follower_matches = list(
        re.finditer(
            r'"follower_count"\s*:\s*(\d+)',
            text,
        )
    )

    if not follower_matches:
        return None

    selected_match = None

    if marker_positions:
        best_distance = None

        for follower_match in follower_matches:
            follower_position = (
                follower_match.start()
            )

            for marker_position in (
                marker_positions
            ):
                distance = abs(
                    follower_position
                    - marker_position
                )

                if (
                    best_distance is None
                    or distance < best_distance
                ):
                    best_distance = (
                        distance
                    )

                    selected_match = (
                        follower_match
                    )

    elif len(
        follower_matches
    ) == 1:
        selected_match = (
            follower_matches[0]
        )

    if selected_match is None:
        return None

    follower_count = int(
        selected_match.group(1)
    )

    follower_position = (
        selected_match.start()
    )

    start = max(
        0,
        follower_position - 100_000,
    )

    end = min(
        len(text),
        follower_position + 100_000,
    )

    profile_text = text[
        start:end
    ]

    username = extract_string_field(
        profile_text,
        "username",
    )

    full_name = extract_string_field(
        profile_text,
        "full_name",
    )

    return {
        "id": str(
            profile_id
        ),
        "username": username,
        "full_name": full_name,
        "follower_count": (
            follower_count
        ),
    }


def extract_profile_from_bytes(
    body: bytes,
    profile_id: str,
):
    if not body:
        return None

    text = body.decode(
        "utf-8",
        errors="replace",
    )

    return extract_profile_from_text(
        text,
        profile_id,
    )


def build_variables(
    profile_id: str,
):
    return {
        "enable_integrity_filters": True,
        "id": str(
            profile_id
        ),
        "__relay_internal__pv__PolarisCannesGuardianExperienceEnabledrelayprovider": True,
        "__relay_internal__pv__PolarisCASB976ProfileEnabledrelayprovider": False,
        "__relay_internal__pv__PolarisWebSchoolsEnabledrelayprovider": False,
        "__relay_internal__pv__PolarisRepostsConsumptionEnabledrelayprovider": False,
        "__relay_internal__pv__PolarisShortDramaEnabledrelayprovider": False,
        "__relay_internal__pv__PolarisLongformEnabledrelayprovider": False,
    }


def build_request(
    profile_id: str,
):
    variables = build_variables(
        profile_id
    )

    form_data = {
        "__d": "www",
        "__user": "0",
        "__a": "1",
        "__comet_req": "7",
        "fb_dtsg": FB_DTSG,
        "jazoest": JAZOEST,
        "lsd": LSD,
        "fb_api_caller_class": (
            "RelayModern"
        ),
        "fb_api_req_friendly_name": (
            "PolarisProfilePageContentQuery"
        ),
        "server_timestamps": (
            "true"
        ),
        "variables": json.dumps(
            variables,
            separators=(
                ",",
                ":",
            ),
        ),
        "doc_id": DOC_ID,
    }

    if AV:
        form_data["av"] = AV

    body = urlencode(
        form_data
    ).encode(
        "utf-8"
    )

    headers = {
        "Accept": "*/*",
        "Content-Type": (
            "application/"
            "x-www-form-urlencoded"
        ),
        "Cookie": COOKIE,
        "User-Agent": USER_AGENT,
        "X-FB-Friendly-Name": (
            "PolarisProfilePageContentQuery"
        ),
        "X-FB-LSD": LSD,
        "X-IG-App-ID": APP_ID,
        "X-IG-Max-Touch-Points": "0",
        "X-CSRFToken": os.getenv("IG_CSRF", ""),
        "X-ASBD-ID": os.getenv("IG_ASBD_ID", "359341"),
        "Origin": (
            "https://www.instagram.com"
        ),
        "Referer": (
            "https://www.instagram.com/"
        ),
    }

    return Request(
        GRAPHQL_URL,
        data=body,
        method="POST",
        headers=headers,
    )


def validate_environment():
    missing = []

    required = {
        "IG_COOKIE": COOKIE,
        "IG_PROFILE_LSD": LSD,
        "IG_FB_DTSG": FB_DTSG,
        "IG_JAZOEST": JAZOEST,
    }

    for name, value in (
        required.items()
    ):
        if not value:
            missing.append(
                name
            )

    if missing:
        raise RuntimeError(
            "Missing environment "
            "variables: "
            + ", ".join(
                missing
            )
        )


def read_response(
    response,
    profile_id: str,
):
    try:
        body = response.read()

        return (
            body,
            False,
        )

    except IncompleteRead as exc:
        body = exc.partial

        profile = (
            extract_profile_from_bytes(
                body,
                profile_id,
            )
        )

        if profile:
            return (
                body,
                True,
            )

        raise


def fetch_profile_by_id(
    profile_id: str,
):
    validate_environment()

    last_error = None

    for attempt in range(
        1,
        MAX_ATTEMPTS + 1,
    ):
        request = build_request(
            profile_id
        )

        try:
            with urlopen(
                request,
                timeout=30,
            ) as response:
                try:
                    (
                        body,
                        was_incomplete,
                    ) = read_response(
                        response,
                        profile_id,
                    )

                except IncompleteRead as exc:
                    last_error = exc

                    print(
                        (
                            "Instagram response "
                            "was incomplete "
                            f"(attempt "
                            f"{attempt}/"
                            f"{MAX_ATTEMPTS})."
                        )
                    )

                    if (
                        attempt
                        < MAX_ATTEMPTS
                    ):
                        time.sleep(
                            attempt * 3
                        )

                    continue

                text = body.decode(
                    "utf-8",
                    errors="replace",
                )

                if (
                    text
                    .lstrip()
                    .lower()
                    .startswith(
                        "<!doctype html"
                    )
                ):
                    last_error = (
                        RuntimeError(
                            (
                                "Instagram returned "
                                "HTML instead of "
                                "GraphQL JSON."
                            )
                        )
                    )

                    print(
                        (
                            "Instagram returned "
                            "HTML instead of "
                            "GraphQL data "
                            f"(attempt "
                            f"{attempt}/"
                            f"{MAX_ATTEMPTS})."
                        )
                    )

                    if (
                        attempt
                        < MAX_ATTEMPTS
                    ):
                        time.sleep(
                            attempt * 3
                        )

                    continue

                profile = (
                    extract_profile_from_text(
                        text,
                        profile_id,
                    )
                )

                if profile:
                    if was_incomplete:
                        print(
                            (
                                "Follower data was "
                                "recovered from the "
                                "partial response."
                            )
                        )

                    return profile

                preview = (
                    text[
                        :300
                    ]
                    .replace(
                        "\n",
                        " ",
                    )
                )

                last_error = (
                    RuntimeError(
                        (
                            "Follower count was "
                            "not found in "
                            "Instagram response."
                        )
                    )
                )

                print(
                    (
                        "Could not find "
                        "follower_count "
                        f"(attempt "
                        f"{attempt}/"
                        f"{MAX_ATTEMPTS})."
                    )
                )

                print(
                    "Response preview:",
                    preview,
                )

                if (
                    attempt
                    < MAX_ATTEMPTS
                ):
                    time.sleep(
                        attempt * 3
                    )

        except HTTPError as exc:
            body = (
                exc.read()
                .decode(
                    "utf-8",
                    errors="replace",
                )
            )

            if exc.code == 429:
                raise RuntimeError(
                    (
                        "Instagram returned "
                        "HTTP 429. "
                        "Stop retrying and "
                        "try again later."
                    )
                ) from exc

            if exc.code in {
                401,
                403,
            }:
                raise RuntimeError(
                    (
                        f"Instagram HTTP "
                        f"{exc.code}. "
                        "Refresh the browser "
                        "request values and "
                        "session."
                    )
                ) from exc

            last_error = exc

            print(
                (
                    f"Instagram HTTP "
                    f"{exc.code} "
                    f"(attempt "
                    f"{attempt}/"
                    f"{MAX_ATTEMPTS})."
                )
            )

            if body:
                print(
                    "Response preview:",
                    body[:300],
                )

            if (
                attempt
                < MAX_ATTEMPTS
            ):
                time.sleep(
                    attempt * 3
                )

        except (
            URLError,
            BrokenPipeError,
            ConnectionResetError,
            TimeoutError,
        ) as exc:
            last_error = exc

            print(
                (
                    "Instagram request "
                    "failed "
                    f"(attempt "
                    f"{attempt}/"
                    f"{MAX_ATTEMPTS}): "
                    f"{exc}"
                )
            )

            if (
                attempt
                < MAX_ATTEMPTS
            ):
                time.sleep(
                    attempt * 3
                )

    raise RuntimeError(
        (
            "Could not retrieve "
            "Instagram follower data "
            f"after {MAX_ATTEMPTS} "
            "attempts."
        )
    ) from last_error


def main():
    if len(
        sys.argv
    ) != 2:
        print(
            "Usage:"
        )

        print(
            (
                "python3 "
                "tools/"
                "instagram-follower-tracker/"
                "fetch_profile.py "
                "<instagram-profile-id>"
            )
        )

        raise SystemExit(
            1
        )

    profile_id = (
        sys.argv[1]
        .strip()
    )

    profile = fetch_profile_by_id(
        profile_id
    )

    print()

    print(
        "Instagram profile"
    )

    print(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )

    print(
        "ID       :",
        profile["id"],
    )

    print(
        "Username :",
        (
            profile[
                "username"
            ]
            or "—"
        ),
    )

    print(
        "Name     :",
        (
            profile[
                "full_name"
            ]
            or "—"
        ),
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


if __name__ == "__main__":
    main()