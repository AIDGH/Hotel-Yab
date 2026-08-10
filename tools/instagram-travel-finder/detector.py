import json
import re
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
LOCATIONS_FILE = BASE_DIR / "iran-locations.json"


def normalize_persian(text: str) -> str:
    text = text.lower()

    replacements = {
        "ي": "ی",
        "ى": "ی",
        "ك": "ک",
        "ۀ": "ه",
        "ة": "ه",
        "\u200c": " ",  # نیم‌فاصله
        "\u200f": " ",
        "\u200e": " ",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    # حذف اعراب
    text = re.sub(r"[\u064b-\u065f\u0670]", "", text)

    # هشتگ، علائم نگارشی، ایموجی و ... → فاصله
    text = re.sub(r"[^\w\sآ-ی]", " ", text)

    # _ هم فاصله حساب شود
    text = text.replace("_", " ")

    text = re.sub(r"\s+", " ", text).strip()

    return text


def load_locations():
    with open(LOCATIONS_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def phrase_exists(text: str, phrase: str) -> bool:
    normalized_phrase = normalize_persian(phrase)

    if not normalized_phrase:
        return False

    # برای جلوگیری از false positive مثل «نور» داخل یک کلمه دیگر
    text_tokens = text.split()
    phrase_tokens = normalized_phrase.split()

    if len(phrase_tokens) == 1:
        return phrase_tokens[0] in text_tokens

    padded_text = f" {text} "
    padded_phrase = f" {normalized_phrase} "

    return padded_phrase in padded_text


def detect_locations(caption: str):
    data = load_locations()
    normalized_caption = normalize_persian(caption)

    matched_provinces = {}
    matched_cities = {}

    for province in data["provinces"]:
        province_matched = False

        for alias in province.get("aliases", []):
            if phrase_exists(normalized_caption, alias):
                province_matched = True
                break

        if province_matched:
            matched_provinces[province["slug"]] = {
                "name": province["name"],
                "slug": province["slug"],
            }

        for city in province.get("cities", []):
            city_matched = False

            for alias in city.get("aliases", []):
                if phrase_exists(normalized_caption, alias):
                    city_matched = True
                    break

            if city_matched:
                matched_cities[city["slug"]] = {
                    "name": city["name"],
                    "slug": city["slug"],
                    "province": province["name"],
                    "provinceSlug": province["slug"],
                }

                # اگر شهر پیدا شد، استانش هم خودکار match شود
                matched_provinces[province["slug"]] = {
                    "name": province["name"],
                    "slug": province["slug"],
                }

    return {
        "isIranTravel": bool(matched_provinces or matched_cities),
        "provinces": list(matched_provinces.values()),
        "cities": list(matched_cities.values()),
    }


def print_result(caption: str):
    result = detect_locations(caption)

    print("\nCaption:")
    print(caption)

    print("\nIran Travel:")
    print("YES" if result["isIranTravel"] else "NO")

    print("\nProvinces:")
    if result["provinces"]:
        for province in result["provinces"]:
            print(f"- {province['name']} ({province['slug']})")
    else:
        print("- None")

    print("\nCities:")
    if result["cities"]:
        for city in result["cities"]:
            print(
                f"- {city['name']} "
                f"({city['slug']}) → {city['province']}"
            )
    else:
        print("- None")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        caption = " ".join(sys.argv[1:])
        print_result(caption)
    else:
        print("Paste an Instagram caption:")
        caption = input("> ")
        print_result(caption)