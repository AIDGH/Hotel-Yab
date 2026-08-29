import json
import re
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
LOCATIONS_FILE = BASE_DIR / "iran-locations.json"

FOREIGN_LOCATION_TERMS = [
    # Turkey
    "ترکیه", "turkey", "استانبول", "istanbul",
    "آنتالیا", "antalya", "کاپادوکیا", "cappadocia",

    # UAE
    "امارات", "uae", "دبی", "dubai",
    "ابوظبی", "abu dhabi",

    # Georgia / Armenia / Azerbaijan
    "گرجستان", "georgia", "تفلیس", "tbilisi",
    "باتومی", "batumi",
    "ارمنستان", "armenia", "ایروان", "yerevan",
    "آذربایجان", "azerbaijan", "باکو", "baku",

    # Russia
    "روسیه", "russia",
    "مسکو", "moscow",
    "سن پترزبورگ", "saint petersburg",

    # Central Asia
    "ازبکستان", "uzbekistan",
    "تاشکند", "tashkent",
    "قزاقستان", "kazakhstan",
    "قرقیزستان", "kyrgyzstan",
    "تاجیکستان", "tajikistan",
    "ترکمنستان", "turkmenistan",

    # Europe
    "فرانسه", "france", "پاریس", "paris",
    "انگلستان", "uk", "london",
    "ایتالیا", "italy", "رم", "rome",
    "اسپانیا", "spain",
    "آلمان", "germany", "berlin",
    "هلند", "netherlands", "amsterdam",
    "سوئیس", "switzerland",
    "یونان", "greece",
    "اتریش", "austria",

    # Asia
    "چین", "china",
    "ژاپن", "japan",
    "کره جنوبی", "south korea",
    "تایلند", "thailand",
    "بانکوک", "bangkok",
    "مالزی", "malaysia",
    "سنگاپور", "singapore",
    "اندونزی", "indonesia",
    "بالی", "bali",
    "مالدیو", "maldives",
    "هند", "india",

    # America/Oceania
    "آمریکا", "usa", "united states",
    "کانادا", "canada",
    "استرالیا", "australia",
    "نیوزیلند", "new zealand",
]

AMBIGUOUS_CITY_SLUGS = {
    "mianeh",
    "nur",
    "ben",
    "saman",
    "baft",
    "sahneh",
    "mahan",
}

TRANSPORT_KEYWORDS = {
    "پرواز",
    "فرودگاه",
    "ایرلاین",
    "هواپیمایی",
    "بلیط",
    "بلیت",
}

TRAVEL_CONTEXT_TERMS = {
    "سفر",
    "تور",
    "ایرانگردی",
    "ایران گردی",
    "گردشگری",
    "طبیعت گردی",
    "طبیعتگردی",
    "کمپ",
    "مسافرت",
    "مقصد",
    "اقامت",
    "جاده",
    "پرواز",
    "trip",
    "travel",
    "tour",
}

STRONG_IRAN_TERMS = {
    "ایرانگردی",
    "ایران گردی",
    "ایران‌گردی",
    "ایران دوستان",
    "ایران‌دوستان",
    "سفر به ایران",
    "سفر در ایران",
    "تور ایران",
    "گردشگری ایران",
    "گردشگری در ایران",
    "خراسان بزرگ",
}

MEDIUM_IRAN_TERMS = {
    "ایران",
    "خراسان",
}


def normalize_persian(text: str | None) -> str:
    text = (text or "").lower()

    replacements = {
        "ي": "ی",
        "ى": "ی",
        "ك": "ک",
        "ۀ": "ه",
        "ة": "ه",
        "\u200c": " ",
        "\u200f": " ",
        "\u200e": " ",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    text = re.sub(
        r"[\u064b-\u065f\u0670]",
        "",
        text,
    )

    text = re.sub(
        r"[^\w\sآ-ی]",
        " ",
        text,
    )

    text = text.replace("_", " ")

    text = re.sub(
        r"\s+",
        " ",
        text,
    ).strip()

    return text


def load_locations():
    with LOCATIONS_FILE.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def phrase_exists(
    text: str,
    phrase: str,
) -> bool:
    normalized_phrase = normalize_persian(
        phrase
    )

    if not normalized_phrase:
        return False

    text_tokens = text.split()
    phrase_tokens = (
        normalized_phrase.split()
    )

    if len(phrase_tokens) == 1:
        return (
            phrase_tokens[0]
            in text_tokens
        )

    padded_text = f" {text} "
    padded_phrase = (
        f" {normalized_phrase} "
    )

    return (
        padded_phrase
        in padded_text
    )


def extract_hashtags(
    text: str,
) -> list[str]:
    hashtags = re.findall(
        r"#([^\s#]+)",
        text or "",
    )

    return [
        normalize_persian(tag)
        for tag in hashtags
        if normalize_persian(tag)
    ]


def alias_in_hashtags(
    hashtags: list[str],
    alias: str,
) -> bool:
    normalized_alias = (
        normalize_persian(alias)
    )

    return any(
        phrase_exists(
            hashtag,
            normalized_alias,
        )
        for hashtag in hashtags
    )


def has_travel_context(
    normalized_caption: str,
) -> bool:
    return any(
        phrase_exists(
            normalized_caption,
            term,
        )
        for term in TRAVEL_CONTEXT_TERMS
    )


def mention_is_transport_only(
    caption: str,
    alias: str,
) -> bool:
    matching_lines = []

    for raw_line in (
        caption or ""
    ).splitlines():
        line = normalize_persian(
            raw_line
        )

        if phrase_exists(
            line,
            alias,
        ):
            matching_lines.append(
                line
            )

    if not matching_lines:
        return False

    return all(
        any(
            phrase_exists(
                line,
                keyword,
            )
            for keyword
            in TRANSPORT_KEYWORDS
        )
        for line in matching_lines
    )


def add_signal(
    signals: dict[str, int],
    name: str,
    weight: int,
):
    signals[name] = max(
        signals.get(name, 0),
        weight,
    )


def first_matching_alias(
    text: str,
    aliases: list[str],
):
    for alias in aliases:
        if phrase_exists(
            text,
            alias,
        ):
            return alias

    return None


def signal_strength(
    score: int,
) -> str:
    if score >= 80:
        return "HIGH"

    if score >= 50:
        return "MEDIUM"

    if score >= 25:
        return "LOW"

    return "NONE"


def detect_locations(
    caption: str,
    location: str | None = None,
):
    data = load_locations()

    normalized_caption = (
        normalize_persian(caption)
    )

    normalized_location = (
        normalize_persian(location)
    )

    foreign_search_text = (
        normalized_caption
        + " "
        + normalized_location
    )

    foreign_detected = any(
        phrase_exists(
            foreign_search_text,
            term,
        )
        for term in FOREIGN_LOCATION_TERMS
    )

    hashtags = extract_hashtags(
        caption
    )

    travel_context = (
        has_travel_context(
            normalized_caption
        )
    )

    matched_provinces = {}
    matched_cities = {}

    signals = {}
    evidence_types = set()

    hashtag_signal = False

    country_aliases = (
        data.get(
            "country",
            {},
        ).get(
            "aliases",
            [],
        )
    )

    for alias in country_aliases:
        if not phrase_exists(
            normalized_caption,
            alias,
        ):
            continue

        normalized_alias = (
            normalize_persian(alias)
        )

        if (
            "ایرانگردی"
            in normalized_alias
            or "ایران گردی"
            in normalized_alias
        ):
            weight = 75
        else:
            weight = 45

        add_signal(
            signals,
            f"country-term: {alias}",
            weight,
        )

        evidence_types.add(
            "country"
        )

        if alias_in_hashtags(
            hashtags,
            alias,
        ):
            hashtag_signal = True

    for term in STRONG_IRAN_TERMS:
        if phrase_exists(
            normalized_caption,
            term,
        ):
            add_signal(
                signals,
                f"iran-term: {term}",
                75,
            )

            evidence_types.add(
                "iran-term"
            )

            if alias_in_hashtags(
                hashtags,
                term,
            ):
                hashtag_signal = True

    for term in MEDIUM_IRAN_TERMS:
        if phrase_exists(
            normalized_caption,
            term,
        ):
            add_signal(
                signals,
                f"iran-term: {term}",
                45
                if term == "ایران"
                else 50,
            )

            evidence_types.add(
                "iran-term"
            )

            if alias_in_hashtags(
                hashtags,
                term,
            ):
                hashtag_signal = True

    for province in data[
        "provinces"
    ]:
        province_alias = (
            first_matching_alias(
                normalized_caption,
                province.get(
                    "aliases",
                    [],
                ),
            )
        )

        if province_alias:
            matched_provinces[
                province["slug"]
            ] = {
                "name": province["name"],
                "slug": province["slug"],
            }

            transport_only = (
                mention_is_transport_only(
                    caption,
                    province_alias,
                )
            )

            weight = (
                25
                if transport_only
                else 60
            )

            if alias_in_hashtags(
                hashtags,
                province_alias,
            ):
                weight += 10
                hashtag_signal = True

            add_signal(
                signals,
                (
                    "province: "
                    f"{province['name']}"
                ),
                min(weight, 75),
            )

            evidence_types.add(
                "province"
            )

        location_province_alias = (
            first_matching_alias(
                normalized_location,
                province.get(
                    "aliases",
                    [],
                ),
            )
        )

        if location_province_alias:
            matched_provinces[
                province["slug"]
            ] = {
                "name": province["name"],
                "slug": province["slug"],
            }

            add_signal(
                signals,
                (
                    "instagram-location: "
                    f"{province['name']}"
                ),
                45,
            )

            evidence_types.add(
                "location"
            )

        for city in province.get(
            "cities",
            [],
        ):
            city_alias = (
                first_matching_alias(
                    normalized_caption,
                    city.get(
                        "aliases",
                        [],
                    ),
                )
            )

            if city_alias:
                is_ambiguous = (
                    city["slug"]
                    in AMBIGUOUS_CITY_SLUGS
                )

                hashtag_match = (
                    alias_in_hashtags(
                        hashtags,
                        city_alias,
                    )
                )

                location_support = (
                    phrase_exists(
                        normalized_location,
                        city_alias,
                    )
                )

                if (
                    not is_ambiguous
                    or travel_context
                    or hashtag_match
                    or location_support
                ):
                    matched_cities[
                        city["slug"]
                    ] = {
                        "name": city["name"],
                        "slug": city["slug"],
                        "province": (
                            province["name"]
                        ),
                        "provinceSlug": (
                            province["slug"]
                        ),
                    }

                    matched_provinces[
                        province["slug"]
                    ] = {
                        "name": (
                            province["name"]
                        ),
                        "slug": (
                            province["slug"]
                        ),
                    }

                    transport_only = (
                        mention_is_transport_only(
                            caption,
                            city_alias,
                        )
                    )

                    if transport_only:
                        weight = 25
                    elif is_ambiguous:
                        weight = 35
                    else:
                        weight = 65

                    if hashtag_match:
                        weight += 10
                        hashtag_signal = True

                    if location_support:
                        weight += 10

                    add_signal(
                        signals,
                        (
                            "city: "
                            f"{city['name']}"
                        ),
                        min(
                            weight,
                            75,
                        ),
                    )

                    evidence_types.add(
                        "city"
                    )

            location_city_alias = (
                first_matching_alias(
                    normalized_location,
                    city.get(
                        "aliases",
                        [],
                    ),
                )
            )

            if location_city_alias:
                matched_cities[
                    city["slug"]
                ] = {
                    "name": city["name"],
                    "slug": city["slug"],
                    "province": (
                        province["name"]
                    ),
                    "provinceSlug": (
                        province["slug"]
                    ),
                }

                matched_provinces[
                    province["slug"]
                ] = {
                    "name": province["name"],
                    "slug": province["slug"],
                }

                add_signal(
                    signals,
                    (
                        "instagram-location: "
                        f"{city['name']}"
                    ),
                    45,
                )

                evidence_types.add(
                    "location"
                )

    if normalized_location:
        country_in_location = any(
            phrase_exists(
                normalized_location,
                alias,
            )
            for alias
            in (
                country_aliases
                + ["iran"]
            )
        )

        if country_in_location:
            add_signal(
                signals,
                "instagram-location: Iran",
                45,
            )

            evidence_types.add(
                "location"
            )

    if travel_context:
        add_signal(
            signals,
            "travel-context",
            20,
        )

    weights = list(
        signals.values()
    )

    score = (
        max(weights)
        if weights
        else 0
    )

    meaningful_types = {
        signal_type
        for signal_type
        in evidence_types
        if signal_type
    }

    if (
        score >= 25
        and travel_context
    ):
        score += 10

    if (
        score >= 25
        and len(
            meaningful_types
        ) >= 2
    ):
        score += 10

    if (
        score >= 25
        and hashtag_signal
    ):
        score += 5

    if foreign_detected:
        score -= 35

        signals["foreign-location-penalty"] = -35

    score = max(
        score,
        0,
    )

    score = min(
        score,
        100,
    )

    strength = signal_strength(
        score
    )

    sorted_signals = [
        name
        for name, weight
        in sorted(
            signals.items(),
            key=lambda item: (
                item[1],
                item[0],
            ),
            reverse=True,
        )
        if weight >= 25
    ]

    return {
        "isIranTravel": (
            score >= 25
        ),
        "signalStrength": strength,
        "signalScore": score,
        "candidateSignals": (
            sorted_signals
        ),
        "provinces": list(
            matched_provinces.values()
        ),
        "cities": list(
            matched_cities.values()
        ),
    }


def print_result(
    caption: str,
):
    result = detect_locations(
        caption
    )

    print("\nIran Travel:")
    print(
        "YES"
        if result["isIranTravel"]
        else "NO"
    )

    print(
        "Strength:",
        result["signalStrength"],
    )

    print(
        "Score:",
        result["signalScore"],
    )

    print("\nSignals:")

    for signal in result[
        "candidateSignals"
    ]:
        print(
            f"- {signal}"
        )

    print("\nProvinces:")

    for province in result[
        "provinces"
    ]:
        print(
            f"- {province['name']}"
        )

    print("\nCities:")

    for city in result[
        "cities"
    ]:
        print(
            f"- {city['name']}"
        )


if __name__ == "__main__":
    if len(sys.argv) > 1:
        caption = " ".join(
            sys.argv[1:]
        )
    else:
        print(
            "Paste an Instagram caption:"
        )
        caption = input("> ")

    print_result(caption)