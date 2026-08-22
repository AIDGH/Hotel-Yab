import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { HotelCard } from "@/components/hotel-card";
import { PersonCard } from "@/components/person-card";
import { SectionHeading } from "@/components/section-heading";
import { getHotels, getNotablePeople } from "@/lib/api";
import { DestinationCard } from "@/components/destination-card";
import { getDestinationCatalog } from "@/lib/destination-catalog";
import { LiveSearchForm } from "@/components/live-search-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [hotelsResult, peopleResult, destinations] = await Promise.all([
    getHotels({ pageSize: 4 }),
    getNotablePeople({ pageSize: 4 }),
    getDestinationCatalog(),
  ]);

  const provinceMap = new Map(
    destinations.provinces.map((province) => [
      province.slug,
      province.name,
    ]),
  );

  const featuredDestinations = [
    ...destinations.provinces.slice(0, 1).map((province) => ({
      name: province.name,
      href: `/destinations/provinces/${province.slug}`,
      subtitle: "استان",
      imageUrl: province.imageUrl,
      description: province.description,
    })),

    ...destinations.cities.slice(0, 2).map((city) => ({
      name: city.name,
      href: `/destinations/cities/${city.slug}`,
      subtitle:
        provinceMap.get(city.parentProvinceSlug) ?? "شهر",
      imageUrl: city.imageUrl,
      description: city.description,
    })),
  ];

  return (
    <main>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              کشف هتل با مدرک، نه با ادعا
            </span>
            <h1>
ردپای آدم‌های معروف را بگیر،
              <span> هتل بعدی‌ات را پیدا کن.</span>
            </h1>
            <p>
              هتل‌یاب رابطه‌ی هتل‌ها با هنرمندان، ورزشکاران و اینفلوئنسرها
              را همراه منبع و وضعیت بررسی، شفاف و قابل پیگیری می‌کند.
            </p>

            <LiveSearchForm variant="hero" />

            <div className="quick-links" aria-label="شهرهای پیشنهادی">
              <span>جست‌وجوی سریع:</span>
              <Link href="/hotels?city=تهران">تهران</Link>
              <Link href="/hotels?city=اصفهان">اصفهان</Link>
              <Link href="/hotels?city=مشهد">مشهد</Link>
              <Link href="/hotels?city=شیراز">شیراز</Link>
              <Link href="/hotels?city=کیش">کیش</Link>
              <Link href="/hotels?city=تبریز">تبریز</Link>
              <Link href="/hotels?city=رشت">رشت</Link>
            </div>
          </div>

          <div className="hero-visual" aria-label="شبکه‌ی ارتباط هتل و چهره‌ها">
            <div className="hero-glow" />
            <div className="story-card story-card-main">
              <div className="story-media story-media-hotel">
                <span>هتل</span>
              </div>
              <div>
                <small>یک رابطه‌ی قابل پیگیری</small>
                <strong>هتل ← حضور چهره ← منبع</strong>
              </div>
            </div>
            <div className="story-card story-card-person">
              <div className="story-avatar">★</div>
              <div>
                <small>فرد شناخته‌شده</small>
                <strong>پروفایل مستند</strong>
              </div>
            </div>
            <div className="proof-pill">
              <span className="proof-check">✓</span>
              <div>
                <strong>منبع بررسی‌شده</strong>
                <small>لینک، تاریخ و نوع مدرک</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-grid">
          <div>
            <strong>مدرک‌محور</strong>
            <span>هر رابطه حداقل یک منبع دارد</span>
          </div>
          <div>
            <strong>شفاف</strong>
            <span>وضعیت بررسی برای کاربر مشخص است</span>
          </div>
          <div>
            <strong>به‌روز</strong>
            <span>داده‌ها با منبع تازه اصلاح می‌شوند</span>
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHeading
          eyebrow="مقصدها"
          title="مقصد بعدی‌تان را کشف کنید"
          description="شهرها و استان‌ها را از مسیر سفرها، تجربه‌ها و محتوای چهره‌ها کشف کنید."
          actionHref="/destinations"
          actionLabel="مشاهده همه مقصدها"
        />

        <div className="card-grid">
          {featuredDestinations.map((destination) => (
            <DestinationCard
              key={destination.href}
              name={destination.name}
              href={destination.href}
              subtitle={destination.subtitle}
              imageUrl={destination.imageUrl}
              description={destination.description}
            />
          ))}
        </div>
      </section>
      <section className="section container">
        <SectionHeading
          eyebrow="هتل‌ها"
          title="هتل‌ها را کشف کنید"
          description="هتل‌های منتشرشده از ابتدا نمایش داده می‌شوند؛ هر رابطه با چهره‌ها فقط پس از تأیید و ثبت منبع منتشر می‌شود."
          actionHref="/hotels"
          actionLabel="مشاهده همه هتل‌ها"
        />

        {hotelsResult.ok && hotelsResult.value.data.length > 0 ? (
          <div className="card-grid">
            {hotelsResult.value.data.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        ) : (
          <EmptyState
            kind={hotelsResult.ok ? "empty" : "unavailable"}
            title={
              hotelsResult.ok
                ? "اولین هتل‌ها در حال ثبت‌اند"
                : "ارتباط با سرویس هتل‌ها برقرار نشد"
            }
            description={
              hotelsResult.ok
                ? "پس از ثبت اطلاعات پایه‌ی هتل‌ها، آن‌ها اینجا نمایش داده می‌شوند."
                : "API را روی پورت ۴۰۰۰ اجرا کنید؛ صفحه بدون از دست رفتن ساختار دوباره داده‌ها را نمایش می‌دهد."
            }
          />
        )}
      </section>

      <section className="section section-tint">
        <div className="container">
          <SectionHeading
            eyebrow="چهره‌ها"
            title="از آدم‌ها به مقصد برسید"
            description="ببینید هر چهره با کدام هتل‌ها ارتباط مستند دارد و مدرک هر ارتباط چیست."
            actionHref="/notable-people"
            actionLabel="مشاهده همه چهره‌ها"
          />

          {peopleResult.ok && peopleResult.value.data.length > 0 ? (
            <div className="people-grid">
              {peopleResult.value.data.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          ) : (
            <EmptyState
              kind={peopleResult.ok ? "empty" : "unavailable"}
              title={
                peopleResult.ok
                  ? "پروفایل‌های عمومی به‌زودی اضافه می‌شوند"
                  : "ارتباط با سرویس چهره‌ها برقرار نشد"
              }
              description="پروفایل‌های اولیه پس از ثبت نمایش داده می‌شوند و وضعیت هر رابطه تا زمان تکمیل منبع مشخص می‌ماند."
            />
          )}
        </div>
      </section>

      {/* بخش معرفی فرایند و فراخوان تکمیل داده فعلاً نمایش داده نمی‌شوند. */}
    </main>
  );
}
