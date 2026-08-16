import argparse
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import jdatetime
from openpyxl import Workbook
from openpyxl.styles import (
    Alignment,
    Border,
    Font,
    PatternFill,
    Side,
)
from openpyxl.worksheet.datavalidation import (
    DataValidation,
)
from openpyxl.formatting.rule import FormulaRule


BASE_DIR = (
    Path(__file__).resolve().parent
)

OUTPUT_DIR = (
    BASE_DIR
    / "output"
)

STRENGTH_ORDER = {
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
    "NONE": 0,
}

PERSIAN_DIGITS = str.maketrans(
    "0123456789",
    "۰۱۲۳۴۵۶۷۸۹",
)


def resolve_input(
    value: str,
) -> Path:
    path = Path(value)

    if path.exists():
        return path

    candidate = (
        OUTPUT_DIR
        / f"{value}.json"
    )

    if candidate.exists():
        return candidate

    raise FileNotFoundError(
        f"JSON file not found: {value}"
    )


def normalize_signals(
    value,
) -> str:
    if isinstance(
        value,
        list,
    ):
        return "\n".join(
            str(item)
            for item in value
        )

    return str(
        value or ""
    )


def contains_hotel(
    item: dict,
) -> bool:
    if item.get(
        "is_hotel_priority",
        False,
    ):
        return True

    text = " ".join(
        [
            str(
                item.get(
                    "caption",
                    "",
                )
            ),
            str(
                item.get(
                    "instagram_location",
                    "",
                )
            ),
        ]
    ).lower()

    return (
        "هتل" in text
        or "hotel" in text
    )


def get_priority(
    item: dict,
) -> str:
    if contains_hotel(
        item
    ):
        return "HOTEL"

    return item.get(
        "signal_strength",
        "NONE",
    )


def sort_key(
    item: dict,
):
    hotel_priority = (
        1
        if contains_hotel(
            item
        )
        else 0
    )

    strength = item.get(
        "signal_strength",
        "NONE",
    )

    score = item.get(
        "signal_score",
        0,
    )

    published_at = item.get(
        "published_at",
        "",
    )

    return (
        hotel_priority,
        STRENGTH_ORDER.get(
            strength,
            0,
        ),
        score,
        published_at,
    )


def to_jalali(
    value: str,
) -> str:
    if not value:
        return ""

    try:
        normalized = value.replace(
            "Z",
            "+00:00",
        )

        date_time = (
            datetime.fromisoformat(
                normalized
            )
        )

        if date_time.tzinfo:
            date_time = (
                date_time.astimezone(
                    ZoneInfo(
                        "Asia/Tehran"
                    )
                )
            )

        jalali_date = (
            jdatetime.date.fromgregorian(
                date=date_time.date()
            )
        )

        result = (
            f"{jalali_date.year:04d}/"
            f"{jalali_date.month:02d}/"
            f"{jalali_date.day:02d}"
        )

        return result.translate(
            PERSIAN_DIGITS
        )

    except (
        ValueError,
        TypeError,
    ):
        return value

def guess_hotel(
    item: dict,
) -> str:
    existing = str(
        item.get(
            "hotel",
            "",
        )
    ).strip()

    if existing:
        return existing

    location = str(
        item.get(
            "instagram_location",
            "",
        )
    ).strip()

    if (
        "هتل" in location
        or "hotel" in location.lower()
    ):
        return location

    caption = str(
        item.get(
            "caption",
            "",
        )
    )

    normalized = (
        caption
        .replace("\n", " ")
        .replace("\u200c", " ")
    )

    words = normalized.split()

    for index, word in enumerate(
        words
    ):
        if (
            "هتل" in word
            or word.lower() == "hotel"
        ):
            start = max(
                0,
                index,
            )

            end = min(
                len(words),
                index + 4,
            )

            return " ".join(
                words[
                    start:end
                ]
            )

    if item.get(
        "is_hotel_priority",
        False,
    ):
        return "نیاز به بررسی"

    return ""

def json_to_excel(
    input_path: Path,
    output_path: Path,
):
    with input_path.open(
        "r",
        encoding="utf-8",
    ) as file:
        data = json.load(file)

    if not isinstance(
        data,
        list,
    ):
        raise ValueError(
            "JSON root must be a list."
        )

    data.sort(
        key=sort_key,
        reverse=True,
    )

    workbook = Workbook()

    sheet = workbook.active
    sheet.title = "Candidates"

    sheet.sheet_view.rightToLeft = (
        True
    )

    headers = [
        "اولویت",
        "امتیاز",
        "اینستاگرام",
        "لینک پست",
        "تاریخ انتشار",
        "لوکیشن اینستاگرام",
        "شهر تشخیص crawler",
        "استان تشخیص crawler",
        "سیگنال‌های تشخیص",
        "کپشن",
        "وضعیت بررسی",
        "هتل",
        "شهر نهایی",
        "استان نهایی",
        "عنوان نهایی",
        "یادداشت",
        "Shortcode",
    ]

    sheet.append(
        headers
    )

    header_fill = PatternFill(
        fill_type="solid",
        fgColor="1F4E78",
    )

    header_font = Font(
        bold=True,
        color="FFFFFF",
    )

    hotel_fill = PatternFill(
        fill_type="solid",
        fgColor="D9EAF7",
    )

    high_fill = PatternFill(
        fill_type="solid",
        fgColor="E2F0D9",
    )

    medium_fill = PatternFill(
        fill_type="solid",
        fgColor="FFF2CC",
    )

    low_fill = PatternFill(
        fill_type="solid",
        fgColor="FCE4D6",
    )

    fill_by_priority = {
        "HOTEL": hotel_fill,
        "HIGH": high_fill,
        "MEDIUM": medium_fill,
        "LOW": low_fill,
    }
    thin_side = Side(
        style="thin",
        color="B7B7B7",
    )

    all_borders = Border(
        left=thin_side,
        right=thin_side,
        top=thin_side,
        bottom=thin_side,
    )

    for cell in sheet[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.border = all_borders

        cell.alignment = Alignment(
            horizontal="center",
            vertical="center",
            wrap_text=True,
        )

    for item in data:
        priority = get_priority(
            item
        )

        row = [
            priority,
            item.get(
                "signal_score",
                0,
            ),
            item.get(
                "instagram_username",
                "",
            ),
            item.get(
                "source_url",
                "",
            ),
            to_jalali(
                item.get(
                    "published_at",
                    "",
                )
            ),
            item.get(
                "instagram_location",
                "",
            ),
            item.get(
                "matched_cities",
                "",
            ),
            item.get(
                "matched_provinces",
                "",
            ),
            normalize_signals(
                item.get(
                    "candidate_signals",
                    [],
                )
            ),
            item.get(
                "caption",
                "",
            ),
            item.get(
                "review_status",
                "pending",
            ),
            guess_hotel(
                item
            ),
            item.get(
                "final_cities"
            )
            or item.get(
                "matched_cities",
                "",
            ),
            item.get(
                "final_provinces"
            )
            or item.get(
                "matched_provinces",
                "",
            ),
            item.get(
                "final_title",
                "",
            ),
            item.get(
                "notes",
                "",
            ),
            item.get(
                "shortcode",
                "",
            ),
        ]

        sheet.append(
            row
        )

        row_number = (
            sheet.max_row
        )

        row_fill = (
            fill_by_priority.get(
                priority
            )
        )

        if row_fill:
            for cell in sheet[
                row_number
            ]:
                cell.fill = (
                    row_fill
                )

        link_cell = sheet.cell(
            row=row_number,
            column=4,
        )

        source_url = item.get(
            "source_url",
            "",
        )

        if source_url:
            link_cell.hyperlink = (
                source_url
            )

            link_cell.style = (
                "Hyperlink"
            )

        for cell in sheet[
            row_number
        ]:
            cell.alignment = Alignment(
                horizontal="center",
                vertical="center",
                wrap_text=True,
            )

            cell.border = all_borders

        sheet.row_dimensions[
            row_number
        ].height = 90

    widths = {
        "A": 13,
        "B": 10,
        "C": 22,
        "D": 42,
        "E": 18,
        "F": 28,
        "G": 30,
        "H": 35,
        "I": 45,
        "J": 80,
        "K": 18,
        "L": 30,
        "M": 30,
        "N": 30,
        "O": 40,
        "P": 35,
        "Q": 20,
    }

    for (
        column,
        width,
    ) in widths.items():
        sheet.column_dimensions[
            column
        ].width = width

    sheet.freeze_panes = "A2"

    if sheet.max_row > 1:
        sheet.auto_filter.ref = (
            f"A1:Q{sheet.max_row}"
        )

    validation = DataValidation(
        type="list",
        formula1=(
            '"pending,approved,rejected"'
        ),
        allow_blank=False,
    )
    pending_fill = PatternFill(
        fill_type="solid",
        fgColor="FFF2CC",
    )

    approved_fill = PatternFill(
        fill_type="solid",
        fgColor="C6EFCE",
    )

    rejected_fill = PatternFill(
        fill_type="solid",
        fgColor="FFC7CE",
    )

    if sheet.max_row > 1:
        status_range = (
            f"K2:K{sheet.max_row}"
        )

        sheet.conditional_formatting.add(
            status_range,
            FormulaRule(
                formula=[
                    '$K2="pending"'
                ],
                fill=pending_fill,
            ),
        )

        sheet.conditional_formatting.add(
            status_range,
            FormulaRule(
                formula=[
                    '$K2="approved"'
                ],
                fill=approved_fill,
            ),
        )

        sheet.conditional_formatting.add(
            status_range,
            FormulaRule(
                formula=[
                    '$K2="rejected"'
                ],
                fill=rejected_fill,
            ),
        )
    sheet.add_data_validation(
        validation
    )

    if sheet.max_row > 1:
        validation.add(
            f"K2:K{sheet.max_row}"
        )

    workbook.save(
        output_path
    )

    print(
        "Excel created:"
    )

    print(
        output_path
    )

    print(
        "Rows:",
        len(data),
    )


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Convert Instagram "
            "candidate JSON "
            "to Excel."
        )
    )

    parser.add_argument(
        "input",
        help=(
            "Username or JSON path"
        ),
    )

    parser.add_argument(
        "--output",
        help=(
            "Optional XLSX "
            "output path"
        ),
    )

    args = parser.parse_args()

    input_path = resolve_input(
        args.input
    )

    if args.output:
        output_path = Path(
            args.output
        )
    else:
        output_path = (
            input_path.with_suffix(
                ".xlsx"
            )
        )

    json_to_excel(
        input_path,
        output_path,
    )


if __name__ == "__main__":
    main()