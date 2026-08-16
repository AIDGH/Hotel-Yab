import argparse
import os
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import json

from openpyxl import load_workbook

DEFAULT_API_BASE = (
    "http://localhost:4000/api/v1"
)

API_BASE = os.getenv(
    "HOTELYAB_API_BASE",
    DEFAULT_API_BASE,
).rstrip("/")

ADMIN_COOKIE = os.getenv(
    "HOTELYAB_ADMIN_COOKIE",
    "",
)

REVIEW_PLACEHOLDERS = {
    "نیاز به بررسی",
    "needs review",
}

class Color:
    RESET = "\033[0m"
    BOLD = "\033[1m"

    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    GRAY = "\033[90m"
    WHITE = "\033[97m"


def color(
    text,
    value,
):
    return (
        f"{value}{text}"
        f"{Color.RESET}"
    )


def label(
    name: str,
    value: str,
):
    print(
        color(
            f"{name:<14}",
            Color.GRAY,
        ),
        value,
    )

def normalize_text(
    value,
) -> str:
    text = str(
        value or ""
    ).strip()

    replacements = {
        "ي": "ی",
        "ى": "ی",
        "ك": "ک",
        "\u200c": " ",
        "\u200f": " ",
        "\u200e": " ",
    }

    for old, new in replacements.items():
        text = text.replace(
            old,
            new,
        )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip().casefold()


def normalize_handle(
    value,
) -> str:
    return (
        normalize_text(value)
        .lstrip("@")
    )


def split_multi(
    value,
) -> list[str]:
    text = str(
        value or ""
    ).strip()

    if not text:
        return []

    return [
        part.strip()
        for part in re.split(
            r"\s*\|\s*",
            text,
        )
        if part.strip()
    ]


def api_get_json(
    path: str,
):
    if not ADMIN_COOKIE:
        raise RuntimeError(
            "HOTELYAB_ADMIN_COOKIE "
            "is not set."
        )

    url = (
        f"{API_BASE}"
        f"{path}"
    )

    request = Request(
        url,
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
                response.read()
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
            "Hotel-Yab API returned "
            f"HTTP {exc.code}: "
            f"{body}"
        ) from exc

    except URLError as exc:
        raise RuntimeError(
            "Could not connect to "
            f"Hotel-Yab API: {exc}"
        ) from exc


def get_collection(
    payload: dict,
    *names: str,
) -> list[dict]:
    root = payload.get(
        "data",
        payload,
    )

    for name in names:
        value = root.get(name)

        if isinstance(
            value,
            list,
        ):
            return value

    return []


def load_catalog():
    payload = api_get_json(
        "/admin/catalog/bootstrap"
    )

    return {
        "destinations": (
            get_collection(
                payload,
                "destinations",
            )
        ),
        "hotels": (
            get_collection(
                payload,
                "hotels",
            )
        ),
        "people": (
            get_collection(
                payload,
                "notablePeople",
                "notable_people",
                "people",
            )
        ),
        "videos": (
            get_collection(
                payload,
                "videos",
            )
        ),
    }


def find_person(
    people: list[dict],
    username: str,
):
    target = normalize_handle(
        username
    )

    for person in people:
        handle = (
            person.get(
                "instagramHandle"
            )
            or person.get(
                "instagram_handle"
            )
            or ""
        )

        if (
            normalize_handle(handle)
            == target
        ):
            return person

    return None


def find_hotel(
    hotels: list[dict],
    hotel_name: str,
):
    target = normalize_text(
        hotel_name
    )

    for hotel in hotels:
        name = hotel.get(
            "name",
            "",
        )

        if (
            normalize_text(name)
            == target
        ):
            return hotel

    return None


def destination_type(
    destination: dict,
) -> str:
    value = normalize_text(
        destination.get(
            "type",
            "",
        )
    )

    if value in {
        "city",
        "cities",
    }:
        return "CITY"

    if value in {
        "province",
        "provinces",
    }:
        return "PROVINCE"

    return value.upper()


def find_destination(
    destinations: list[dict],
    name: str,
    expected_type: str,
):
    target = normalize_text(
        name
    )

    for destination in destinations:
        if (
            destination_type(
                destination
            )
            != expected_type
        ):
            continue

        destination_name = (
            destination.get(
                "name",
                "",
            )
        )

        if (
            normalize_text(
                destination_name
            )
            == target
        ):
            return destination

    return None


def find_video_by_source(
    videos: list[dict],
    source_url: str,
):
    target = (
        str(source_url or "")
        .strip()
        .rstrip("/")
    )

    for video in videos:
        existing = (
            str(
                video.get(
                    "sourceUrl",
                    "",
                )
            )
            .strip()
            .rstrip("/")
        )

        if (
            existing
            and existing == target
        ):
            return video

    return None


def load_excel_rows(
    path: Path,
):
    workbook = load_workbook(
        path,
        data_only=True,
    )

    sheet = (
        workbook[
            "Candidates"
        ]
        if "Candidates"
        in workbook.sheetnames
        else workbook.active
    )

    headers = {}

    for column in range(
        1,
        sheet.max_column + 1,
    ):
        value = sheet.cell(
            row=1,
            column=column,
        ).value

        if value is not None:
            headers[
                str(value).strip()
            ] = column

    required_headers = [
        "اینستاگرام",
        "لینک پست",
        "وضعیت بررسی",
        "هتل",
        "شهر نهایی",
        "استان نهایی",
    ]

    missing = [
        header
        for header
        in required_headers
        if header not in headers
    ]

    if missing:
        raise RuntimeError(
            "Missing Excel columns: "
            + ", ".join(missing)
        )

    rows = []

    for row_number in range(
        2,
        sheet.max_row + 1,
    ):
        row = {
            header: sheet.cell(
                row=row_number,
                column=column,
            ).value
            for (
                header,
                column,
            )
            in headers.items()
        }

        row["_row_number"] = (
            row_number
        )

        rows.append(row)

    return rows


def is_approved(
    row: dict,
) -> bool:
    return (
        normalize_text(
            row.get(
                "وضعیت بررسی"
            )
        )
        == "approved"
    )


def clean_hotel_name(
    value,
) -> str:
    value = str(
        value or ""
    ).strip()

    if (
        normalize_text(value)
        in {
            normalize_text(item)
            for item
            in REVIEW_PLACEHOLDERS
        }
    ):
        return ""

    return value


def analyze_row(
    row: dict,
    catalog: dict,
):
    problems = []
    warnings = []

    row_number = row[
        "_row_number"
    ]

    username = str(
        row.get(
            "اینستاگرام",
            "",
        )
        or ""
    ).strip()

    source_url = str(
        row.get(
            "لینک پست",
            "",
        )
        or ""
    ).strip()

    hotel_name = (
        clean_hotel_name(
            row.get("هتل")
        )
    )

    city_names = split_multi(
        row.get(
            "شهر نهایی"
        )
    )

    province_names = split_multi(
        row.get(
            "استان نهایی"
        )
    )

    title = str(
        row.get(
            "عنوان نهایی",
            "",
        )
        or ""
    ).strip()

    if not username:
        problems.append(
            "Instagram username "
            "is empty"
        )

    if not source_url:
        problems.append(
            "source_url is empty"
        )

    existing_video = None

    if source_url:
        existing_video = (
            find_video_by_source(
                catalog["videos"],
                source_url,
            )
        )

    if existing_video:
        return {
            "row": row_number,
            "status": "ALREADY_EXISTS",
            "username": username,
            "source_url": source_url,
            "hotel": hotel_name,
            "cities": city_names,
            "provinces": (
                province_names
            ),
            "person": None,
            "destinations": [],
            "hotel_record": None,
            "problems": [],
            "warnings": [],
        }

    person = None

    if username:
        person = find_person(
            catalog["people"],
            username,
        )

        if not person:
            warnings.append(
                "Person does not exist "
                "and will need "
                "AUTO CREATE"
            )

    destination_records = []

    for city_name in city_names:
        destination = (
            find_destination(
                catalog[
                    "destinations"
                ],
                city_name,
                "CITY",
            )
        )

        if destination:
            destination_records.append(
                destination
            )
        else:
            problems.append(
                "Missing city: "
                f"{city_name}"
            )

    for province_name in (
        province_names
    ):
        destination = (
            find_destination(
                catalog[
                    "destinations"
                ],
                province_name,
                "PROVINCE",
            )
        )

        if destination:
            destination_records.append(
                destination
            )
        else:
            problems.append(
                "Missing province: "
                f"{province_name}"
            )

    if not (
        city_names
        or province_names
    ):
        problems.append(
            "No final city "
            "or province"
        )

    hotel_record = None

    if hotel_name:
        hotel_record = find_hotel(
            catalog["hotels"],
            hotel_name,
        )

        if not hotel_record:
            problems.append(
                "Missing hotel: "
                f"{hotel_name}"
            )

    if not title:
        warnings.append(
            "Final title is empty"
        )

    status = (
        "BLOCKED"
        if problems
        else "READY"
    )

    return {
        "row": row_number,
        "status": status,
        "username": username,
        "source_url": source_url,
        "hotel": hotel_name,
        "cities": city_names,
        "provinces": province_names,
        "person": person,
        "destinations": (
            destination_records
        ),
        "hotel_record": (
            hotel_record
        ),
        "problems": problems,
        "warnings": warnings,
    }


def print_result(
    result: dict,
):
    status = result["status"]
    row_number = result["row"]

    print()

    if status == "READY":
        status_text = color(
            f"✅ ROW {row_number} — READY",
            Color.GREEN
            + Color.BOLD,
        )

    elif status == "BLOCKED":
        status_text = color(
            f"❌ ROW {row_number} — BLOCKED",
            Color.RED
            + Color.BOLD,
        )

    elif status == "ALREADY_EXISTS":
        status_text = color(
            (
                f"⏭ ROW {row_number} "
                "— ALREADY EXISTS"
            ),
            Color.CYAN
            + Color.BOLD,
        )

    else:
        status_text = (
            f"ROW {row_number} — {status}"
        )

    separator = (
        "━━━━━━━━━━━━━━━━━━━━━━━━"
        "━━━━━━━━━━━━━━━━━━━━"
    )

    print(
        color(
            separator,
            Color.GRAY,
        )
    )

    print(
        status_text
    )

    print(
        color(
            separator,
            Color.GRAY,
        )
    )

    label(
        "Instagram",
        (
            result["username"]
            or "—"
        ),
    )

    source_url = (
        result["source_url"]
        or "—"
    )

    label(
        "Source",
        color(
            source_url,
            Color.CYAN,
        ),
    )

    if status == "ALREADY_EXISTS":
        print()

        print(
            color(
                (
                    "This video already "
                    "exists in Hotel-Yab."
                ),
                Color.CYAN,
            )
        )

        print(
            color(
                (
                    "Nothing will be "
                    "created for this row."
                ),
                Color.GRAY,
            )
        )

        return

    person = result["person"]

    if person:
        label(
            "Person",
            color(
                "✅ FOUND",
                Color.GREEN,
            ),
        )

    else:
        label(
            "Person",
            color(
                "⚠ AUTO CREATE",
                Color.YELLOW,
            ),
        )

    hotel_name = result["hotel"]

    if hotel_name:
        if result["hotel_record"]:
            label(
                "Hotel",
                color(
                    (
                        f"✅ {hotel_name} "
                        "— FOUND"
                    ),
                    Color.GREEN,
                ),
            )

        else:
            label(
                "Hotel",
                color(
                    (
                        f"❌ {hotel_name} "
                        "— NOT FOUND"
                    ),
                    Color.RED,
                ),
            )

    else:
        label(
            "Hotel",
            color(
                "—",
                Color.GRAY,
            ),
        )

    if result["cities"]:
        city_values = []

        for city_name in (
            result["cities"]
        ):
            found = find_destination(
                catalog_for_print[
                    "destinations"
                ],
                city_name,
                "CITY",
            )

            if found:
                city_values.append(
                    color(
                        f"✅ {city_name}",
                        Color.GREEN,
                    )
                )

            else:
                city_values.append(
                    color(
                        f"❌ {city_name}",
                        Color.RED,
                    )
                )

        label(
            "City",
            " | ".join(
                city_values
            ),
        )

    else:
        label(
            "City",
            color(
                "—",
                Color.GRAY,
            ),
        )

    if result["provinces"]:
        province_values = []

        for province_name in (
            result["provinces"]
        ):
            found = find_destination(
                catalog_for_print[
                    "destinations"
                ],
                province_name,
                "PROVINCE",
            )

            if found:
                province_values.append(
                    color(
                        (
                            f"✅ "
                            f"{province_name}"
                        ),
                        Color.GREEN,
                    )
                )

            else:
                province_values.append(
                    color(
                        (
                            f"❌ "
                            f"{province_name}"
                        ),
                        Color.RED,
                    )
                )

        label(
            "Province",
            " | ".join(
                province_values
            ),
        )

    else:
        label(
            "Province",
            color(
                "—",
                Color.GRAY,
            ),
        )

    media_type = (
        "hotel-videos"
        if hotel_name
        else "travel-videos"
    )

    label(
        "Media",
        color(
            media_type,
            (
                Color.BLUE
                if hotel_name
                else Color.MAGENTA
            ),
        ),
    )

    if result["warnings"]:
        print()

        print(
            color(
                "WARNINGS:",
                Color.YELLOW
                + Color.BOLD,
            )
        )

        for warning in result[
            "warnings"
        ]:
            print(
                color(
                    f"  ⚠ {warning}",
                    Color.YELLOW,
                )
            )

    if result["problems"]:
        print()

        print(
            color(
                "BLOCK REASONS:",
                Color.RED
                + Color.BOLD,
            )
        )

        for problem in result[
            "problems"
        ]:
            print(
                color(
                    f"  ❌ {problem}",
                    Color.RED,
                )
            )


def run_dry_run(
    excel_path: Path,
):
    global catalog_for_print
    print(
        "Loading Hotel-Yab catalog..."
    )

    catalog = load_catalog()
    catalog_for_print = catalog

    print(
        "Catalog:"
    )
    print(
        " Destinations:",
        len(
            catalog[
                "destinations"
            ]
        ),
    )
    print(
        " Hotels:",
        len(
            catalog["hotels"]
        ),
    )
    print(
        " People:",
        len(
            catalog["people"]
        ),
    )
    print(
        " Videos:",
        len(
            catalog["videos"]
        ),
    )

    rows = load_excel_rows(
        excel_path
    )

    approved = [
        row
        for row in rows
        if is_approved(row)
    ]

    print(
        "\nApproved rows:",
        len(approved),
    )

    results = [
        analyze_row(
            row,
            catalog,
        )
        for row in approved
    ]

    for result in results:
        print_result(result)

    ready = sum(
        result["status"]
        == "READY"
        for result in results
    )

    blocked = sum(
        result["status"]
        == "BLOCKED"
        for result in results
    )

    existing = sum(
        result["status"]
        == "ALREADY_EXISTS"
        for result in results
    )

    print()

    print(
        color(
            (
                "════════════════ "
                "DRY RUN SUMMARY "
                "════════════════"
            ),
            Color.BOLD
            + Color.WHITE,
        )
    )

    print()

    label(
        "Approved",
        color(
            str(
                len(results)
            ),
            Color.WHITE,
        ),
    )

    label(
        "✅ Ready",
        color(
            str(ready),
            Color.GREEN
            + Color.BOLD,
        ),
    )

    label(
        "❌ Blocked",
        color(
            str(blocked),
            Color.RED
            + Color.BOLD,
        ),
    )

    label(
        "⏭ Existing",
        color(
            str(existing),
            Color.CYAN,
        ),
    )

    print()

    if blocked:
        print(
            color(
                (
                    f"{blocked} row(s) "
                    "need attention "
                    "before --apply."
                ),
                Color.RED,
            )
        )

    elif ready:
        print(
            color(
                (
                    "All new approved "
                    "rows are ready."
                ),
                Color.GREEN,
            )
        )

    print()

    print(
        color(
            (
                "No database changes "
                "were made."
            ),
            Color.GRAY,
        )
    )


def main():
    parser = (
        argparse.ArgumentParser(
            description=(
                "Validate approved "
                "Instagram video rows "
                "against Hotel-Yab."
            )
        )
    )

    parser.add_argument(
        "excel",
        help=(
            "Path to reviewed "
            "XLSX file"
        ),
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help=(
            "Validate without "
            "creating anything"
        ),
    )

    args = parser.parse_args()

    if not args.dry_run:
        raise RuntimeError(
            "For now run this importer "
            "with --dry-run."
        )

    excel_path = Path(
        args.excel
    )

    if not excel_path.exists():
        raise FileNotFoundError(
            excel_path
        )

    run_dry_run(
        excel_path
    )


if __name__ == "__main__":
    main()