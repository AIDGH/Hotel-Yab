import json
import os
import shlex
import time
from http.client import IncompleteRead
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CURL_FILE = BASE_DIR / "query.curl"
GRAPHQL_URL = "https://www.instagram.com/graphql/query"
REQUEST_OVERRIDE: tuple[str, dict[str, str], str] | None = None


def configure_request(
    url: str,
    headers: dict[str, str],
    body: str,
) -> None:
    global REQUEST_OVERRIDE
    REQUEST_OVERRIDE = (url, headers, body)


def clear_request() -> None:
    global REQUEST_OVERRIDE
    REQUEST_OVERRIDE = None


def resolve_curl_file() -> Path:
    configured = os.environ.get(
        "IG_CURL_FILE",
        "",
    ).strip()

    path = (
        Path(configured).expanduser()
        if configured
        else DEFAULT_CURL_FILE
    )

    if not path.exists():
        raise RuntimeError(
            "Instagram cURL capture is missing. "
            f"Save Chrome 'Copy as cURL' output to: {path}"
        )

    return path


def parse_curl_capture(
    curl_text: str,
) -> tuple[str, dict[str, str], str]:
    curl_index = curl_text.find(
        "curl "
    )

    if curl_index == -1:
        raise RuntimeError(
            "Instagram capture does not contain a cURL command."
        )

    curl_text = curl_text[
        curl_index:
    ]

    tokens = shlex.split(
        curl_text,
        posix=True,
    )

    if not tokens:
        raise RuntimeError(
            "Instagram cURL capture is empty."
        )

    url = ""
    headers: dict[str, str] = {}
    cookie = ""
    body = ""

    index = 1

    while index < len(tokens):
        token = tokens[index]

        if token in {
            "-H",
            "--header",
        }:
            index += 1

            if index >= len(tokens):
                break

            header = tokens[index]

            if ":" in header:
                name, value = header.split(
                    ":",
                    1,
                )

                headers[
                    name.strip()
                ] = value.strip()

        elif token in {
            "-b",
            "--cookie",
        }:
            index += 1

            if index < len(tokens):
                cookie = tokens[index]

        elif token in {
            "--data-raw",
            "--data",
            "--data-binary",
            "-d",
        }:
            index += 1

            if index < len(tokens):
                body = tokens[index]

        elif token.startswith(
            "--data-raw="
        ):
            body = token.split(
                "=",
                1,
            )[1]

        elif token.startswith(
            "--data="
        ):
            body = token.split(
                "=",
                1,
            )[1]

        elif token.startswith(
            "http://"
        ) or token.startswith(
            "https://"
        ):
            url = token

        index += 1

    if not url:
        url = GRAPHQL_URL

    if not body:
        raise RuntimeError(
            "Instagram cURL capture has no request body."
        )

    if cookie:
        headers[
            "Cookie"
        ] = cookie

    return (
        url,
        headers,
        body,
    )


def update_request_body(
    raw_body: str,
    after: str | None,
    expected_username: str | None = None,
) -> bytes:
    pairs = parse_qsl(
        raw_body,
        keep_blank_values=True,
    )

    form = dict(
        pairs
    )

    variables_raw = form.get(
        "variables",
        "",
    )

    if not variables_raw:
        raise RuntimeError(
            "Instagram cURL capture has no variables field."
        )

    try:
        variables = json.loads(
            variables_raw
        )
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Instagram cURL variables are not valid JSON."
        ) from exc

    if not isinstance(variables, dict):
        raise RuntimeError("Instagram cURL variables must be an object.")
    if expected_username is not None:
        captured_username = str(variables.get("username") or "").strip()
        if not captured_username:
            raise RuntimeError("درخواست cURL باید مربوط به پست‌های یک چهره و دارای username باشد.")
        if captured_username.lower() != expected_username.strip().lower():
            raise RuntimeError(
                f"درخواست cURL مربوط به @{captured_username} است، نه @{expected_username}."
            )

    variables[
        "after"
    ] = after

    form[
        "variables"
    ] = json.dumps(
        variables,
        ensure_ascii=False,
        separators=(
            ",",
            ":",
        ),
    )

    doc_id_override = os.environ.get(
        "IG_DOC_ID",
        "",
    ).strip()

    if doc_id_override:
        form[
            "doc_id"
        ] = doc_id_override

    return urlencode(
        form,
    ).encode(
        "utf-8"
    )


def build_request(
    after: str | None,
    expected_username: str | None = None,
) -> Request:
    if REQUEST_OVERRIDE is not None:
        url, configured_headers, raw_body = REQUEST_OVERRIDE
        headers = dict(configured_headers)
    else:
        curl_file = resolve_curl_file()
        curl_text = curl_file.read_text(encoding="utf-8")
        url, headers, raw_body = parse_curl_capture(curl_text)

    cookie_override = os.environ.get(
        "IG_COOKIE",
        "",
    ).strip()

    if cookie_override and REQUEST_OVERRIDE is None:
        headers[
            "Cookie"
        ] = cookie_override

    headers.pop(
        "content-length",
        None,
    )

    headers.pop(
        "Content-Length",
        None,
    )

    body = update_request_body(
        raw_body,
        after,
        expected_username,
    )

    return Request(
        url,
        data=body,
        headers=headers,
        method="POST",
    )


def decode_json_response(
    response_body: str,
    status: int,
    content_type: str,
) -> dict:
    text = response_body.lstrip()

    if text.startswith(
        "for (;;);"
    ):
        text = text[
            len(
                "for (;;);"
            ):
        ].lstrip()

    if not text:
        raise RuntimeError(
            "Instagram returned an empty response "
            f"(HTTP {status}, Content-Type: {content_type or 'unknown'})."
        )

    try:
        payload = json.loads(
            text
        )
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Instagram returned a non-JSON response "
            f"(HTTP {status}, Content-Type: {content_type or 'unknown'}, "
            f"length: {len(response_body)})."
        ) from exc

    if not isinstance(
        payload,
        dict,
    ):
        raise RuntimeError(
            "Instagram GraphQL response root is not an object."
        )

    errors = payload.get("errors")
    if errors and not only_unused_location_image_errors(payload):
        raise RuntimeError(
            "Instagram GraphQL error: "
            f"{errors}"
        )

    return payload


def only_unused_location_image_errors(payload: dict) -> bool:
    errors = payload.get("errors")
    data = payload.get("data")
    if not isinstance(errors, list) or not errors or not isinstance(data, dict):
        return False
    for error in errors:
        path = error.get("path") if isinstance(error, dict) else None
        if (
            not isinstance(path, list)
            or len(path) != 6
            or path[0] not in (
                "xdt_api__v1__feed__user_timeline_graphql_connection",
                "xdt_api__v1__clips__user__connection_v2",
            )
            or path[1] != "edges"
            or type(path[2]) is not int
            or path[3:] != ["node", "location", "profile_pic_url"]
        ):
            return False
        connection = data.get(path[0])
        if not isinstance(connection, dict):
            return False
        edges = connection.get("edges")
        if (
            not isinstance(edges, list)
            or not 0 <= path[2] < len(edges)
            or not isinstance(connection.get("page_info"), dict)
        ):
            return False
        edge = edges[path[2]]
        if not isinstance(edge, dict) or not isinstance(edge.get("node"), dict):
            return False
    return True


def fetch_profile_page(
    username: str,
    after: str | None = None,
    count: int = 12,
) -> dict:
    del count

    last_error = None

    for attempt in range(
        1,
        4,
    ):
        request = build_request(
            after,
            expected_username=username,
        )

        response_body = ""
        response_status = 0
        content_type = ""

        try:
            with urlopen(
                request,
                timeout=45,
            ) as response:
                response_status = getattr(
                    response,
                    "status",
                    200,
                )

                content_type = response.headers.get(
                    "Content-Type",
                    "",
                )

                raw_body = response.read()

                response_body = raw_body.decode(
                    "utf-8",
                    errors="replace",
                )

        except IncompleteRead as exc:
            last_error = exc

            if attempt < 3:
                print(
                    "Instagram response incomplete, retrying "
                    f"({attempt}/3)..."
                )

                time.sleep(
                    2
                )

                continue

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
            last_error = exc

            if attempt < 3:
                print(
                    "Instagram request failed, retrying "
                    f"({attempt}/3)..."
                )

                time.sleep(
                    2
                )

                continue

            raise RuntimeError(
                f"Instagram request failed: {exc}"
            ) from exc

        try:
            return decode_json_response(
                response_body,
                response_status,
                content_type,
            )

        except RuntimeError as exc:
            last_error = exc

            retryable_json = (
                "application/json"
                in content_type.lower()
                and (
                    "non-JSON response"
                    in str(exc)
                    or "empty response"
                    in str(exc)
                )
            )

            if (
                retryable_json
                and attempt < 3
            ):
                print(
                    "Instagram JSON response was truncated, retrying "
                    f"({attempt}/3)..."
                )

                time.sleep(
                    2
                )

                continue

            raise

    raise RuntimeError(
        "Instagram request failed after 3 attempts."
    ) from last_error
