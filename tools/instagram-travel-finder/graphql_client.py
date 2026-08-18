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
) -> Request:
    curl_file = resolve_curl_file()

    curl_text = curl_file.read_text(
        encoding="utf-8",
    )

    url, headers, raw_body = (
        parse_curl_capture(
            curl_text
        )
    )

    cookie_override = os.environ.get(
        "IG_COOKIE",
        "",
    ).strip()

    if cookie_override:
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
        preview = (
            text[:300]
            .replace(
                "\n",
                " ",
            )
            .replace(
                "\r",
                " ",
            )
        )

        raise RuntimeError(
            "Instagram returned a non-JSON response "
            f"(HTTP {status}, Content-Type: {content_type or 'unknown'}, "
            f"length: {len(response_body)}). "
            f"Preview: {preview}"
        ) from exc

    if not isinstance(
        payload,
        dict,
    ):
        raise RuntimeError(
            "Instagram GraphQL response root is not an object."
        )

    if payload.get(
        "errors"
    ):
        raise RuntimeError(
            "Instagram GraphQL error: "
            f"{payload['errors']}"
        )

    return payload


def fetch_profile_page(
    username: str,
    after: str | None = None,
    count: int = 12,
) -> dict:
    del username
    del count

    last_error = None

    for attempt in range(
        1,
        4,
    ):
        request = build_request(
            after
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

