from detector import detect_locations


TEST_CASES = [
    {
        "caption": "این بار رفتیم مشهد و چند روز هم نیشابور بودیم",
        "expected_cities": {"mashhad", "neyshabur"},
        "expected_provinces": {"razavi-khorasan"},
    },
    {
        "caption": "سفر جذاب ما به خراسان بزرگ",
        "expected_cities": set(),
        "expected_provinces": {
            "razavi-khorasan",
            "north-khorasan",
            "south-khorasan",
        },
    },
    {
        "caption": "شیراز همیشه یکی از دوست‌داشتنی‌ترین شهرهای ایرانه",
        "expected_cities": {"shiraz"},
        "expected_provinces": {"fars"},
    },
    {
        "caption": "آخر هفته رفتیم رشت و بعدش لاهیجان",
        "expected_cities": {"rasht", "lahijan"},
        "expected_provinces": {"gilan"},
    },
    {
        "caption": "چند روز عالی در جزیره کیش",
        "expected_cities": {"kish"},
        "expected_provinces": {"hormozgan"},
    },
    {
        "caption": "سفر به چابهار یکی از بهترین تجربه‌هام بود",
        "expected_cities": {"chabahar"},
        "expected_provinces": {"sistan-baluchestan"},
    },
    {
        "caption": "هوای خنک اردبیل و آبگرم سرعین عالی بود",
        "expected_cities": {"ardabil", "sareyn"},
        "expected_provinces": {"ardabil"},
    },
    {
        "caption": "یزد و میبد؛ دو مقصد فوق‌العاده تاریخی",
        "expected_cities": {"yazd", "meybod"},
        "expected_provinces": {"yazd"},
    },
    {
        "caption": "امروز نور خیلی خوبی برای عکاسی داشتیم",
        "expected_cities": set(),
        "expected_provinces": set(),
    },
    {
        "caption": "بمب انرژی بود این سفر!",
        "expected_cities": set(),
        "expected_provinces": set(),
    },
    {
        "caption": "آخر هفته خونه بودیم و فیلم دیدیم",
        "expected_cities": set(),
        "expected_provinces": set(),
    },
    {
        "caption": "سفر زمستونی به استان کردستان و شهر مریوان",
        "expected_cities": {"marivan"},
        "expected_provinces": {"kurdistan"},
    },
    {
        "caption": "امروز کلی راه رفتیم ولی اسم مقصد رو ننوشتم",
        "location": "Shiraz, Iran",
        "expected_cities": set(),
        "expected_provinces": set(),
    },
    {
        "caption": "یه روز خیلی خوب داشتیم",
        "location": "Bandar Abbas, Iran",
        "expected_cities": set(),
        "expected_provinces": set(),
    },
    {
        "caption": (
            "ویلدان یه دوست قدیمیه. "
            "هر چند وقت یک جای دنیا همو میبینیم. "
            "پاریس، تهران، استانبول."
        ),
        "location": "Paris, France",
        "expected_cities": set(),
        "expected_provinces": set(),
    },
    {
        "caption": (
            "اجرای هفتم سفر گروهی به آسیای میانه. "
            "#تور_آسیای_میانه #سمرقند"
        ),
        "location": "Samarkand",
        "expected_cities": set(),
        "expected_provinces": set(),
    },
    {
        "caption": (
            "فردا میرم دنبال پاسپورت جدیدم، "
            "تا جون داری سفر برو و کشف کن"
        ),
        "location": "Tehran, Iran",
        "expected_cities": set(),
        "expected_provinces": set(),
    },
    {
        "caption": (
            "تور روسیه\n"
            "با پرواز ماهان: تهران–سن‌پترزبورگ\n"
            "مسکو–تهران"
        ),
        "location": "",
        "expected_cities": set(),
        "expected_provinces": set(),
    },
    {
        "caption": (
            "من عاشق ایرانگردی و سفر "
            "با ایران‌دوستان هستم. "
            "#ایرانگردی #خراسان"
        ),
        "location": "",
        "expected_cities": set(),
        "expected_provinces": set(),
        "expected_is_iran_travel": True,
    },
]


def run_tests():
    passed = 0

    for index, test in enumerate(TEST_CASES, start=1):
        result = detect_locations(
            test["caption"],
            test.get("location"),
        )

        actual_cities = {
            city["slug"]
            for city in result["cities"]
        }

        actual_provinces = {
            province["slug"]
            for province in result["provinces"]
        }

        cities_ok = actual_cities == test["expected_cities"]
        provinces_ok = (
            actual_provinces == test["expected_provinces"]
        )

        success = cities_ok and provinces_ok

        print(f"\nTest {index}: {'PASS' if success else 'FAIL'}")
        print(f"Caption: {test['caption']}")

        if not success:
            print(
                "Expected cities:",
                test["expected_cities"],
            )

            print(
                "Actual cities:",
                actual_cities,
            )

            print(
                "Expected provinces:",
                test["expected_provinces"],
            )

            print(
                "Expected is Iran travel:",
                test["expected_is_iran_travel"],
            )

            print(
                "Actual provinces:",
                actual_provinces,
            )

        if success:
            passed += 1

    print("\n-----------------------------")
    print(f"Passed: {passed}/{len(TEST_CASES)}")
    print(
        f"Accuracy: "
        f"{passed / len(TEST_CASES) * 100:.1f}%"
    )


if __name__ == "__main__":
    run_tests()