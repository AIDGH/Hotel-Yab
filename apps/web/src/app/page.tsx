import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { HotelCard } from "@/components/hotel-card";
import { PersonCard } from "@/components/person-card";
import { SectionHeading } from "@/components/section-heading";
import { getHotels, getNotablePeople } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [hotelsResult, peopleResult] = await Promise.all([
    getHotels({ pageSize: 4 }),
    getNotablePeople({ pageSize: 4 }),
  ]);

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

            <form className="hero-search" action="/hotels" method="get">
              <label className="sr-only" htmlFor="hero-query">
                جست‌وجوی هتل، شهر یا چهره
              </label>
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                id="hero-query"
                name="query"
                placeholder="نام هتل یا شهر را جست‌وجو کنید..."
                autoComplete="off"
              />
              <button type="submit">جست‌وجو</button>
            </form>

            <div className="quick-links" aria-label="شهرهای پیشنهادی">
              <span>جست‌وجوی سریع:</span>
              <Link href="/hotels?city=تهران">تهران</Link>
              <Link href="/hotels?city=اصفهان">اصفهان</Link>
              <Link href="/hotels?city=مشهد">مشهد</Link>
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

      <section className="section container" id="how-it-works">
        <SectionHeading
          align="center"
          eyebrow="چرا هتل‌یاب؟"
          title="از یک ادعا تا یک رابطه‌ی قابل اعتماد"
          description="فرایند انتشار طوری طراحی شده که هر نتیجه را بتوان دوباره بررسی کرد."
        />
        <div className="process-grid">
          <article className="process-card">
            <span>۰۱</span>
            <div className="process-icon">⌁</div>
            <h3>پیدا کردن سرنخ</h3>
            <p>پست، ویدیو، خبر یا صفحه‌ی رسمی به‌عنوان سرنخ ثبت می‌شود.</p>
          </article>
          <article className="process-card featured">
            <span>۰۲</span>
            <div className="process-icon">✓</div>
            <h3>بررسی و تطبیق</h3>
            <p>هتل، فرد، نوع ارتباط و اعتبار منبع به‌صورت جدا بررسی می‌شوند.</p>
          </article>
          <article className="process-card">
            <span>۰۳</span>
            <div className="process-icon">↗</div>
            <h3>انتشار شفاف</h3>
            <p>رابطه همراه خلاصه، زمان بررسی و لینک منبع در دسترس قرار می‌گیرد.</p>
          </article>
        </div>
      </section>

      <section className="section container">
        <div className="cta-panel">
          <div>
            <span className="eyebrow eyebrow-light">داده‌ای برای تکمیل دارید؟</span>
            <h2>هر مدرک می‌تواند یک مقصد را معتبرتر کند.</h2>
            <p>
              امکان گزارش اطلاعات نادرست و پیشنهاد منبع تازه در نسخه‌های بعدی
              اضافه می‌شود.
            </p>
          </div>
          <Link className="button button-light" href="/hotels">
            شروع کشف هتل‌ها
          </Link>
        </div>
      </section>
    </main>
  );
}
