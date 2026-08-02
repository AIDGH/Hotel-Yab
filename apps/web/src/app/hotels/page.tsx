import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { HotelCard } from "@/components/hotel-card";
import { getHotels } from "@/lib/api";

export const metadata: Metadata = {
  title: "کشف هتل‌ها",
  description: "فهرست هتل‌های دارای ارتباط مستند و تأییدشده.",
};

export const dynamic = "force-dynamic";

type HotelsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function HotelsPage({ searchParams }: HotelsPageProps) {
  const params = await searchParams;
  const query = readParam(params.query);
  const city = readParam(params.city);
  const result = await getHotels({ query, city, pageSize: 24 });

  return (
    <main className="listing-page">
      <section className="page-hero page-hero-compact">
        <div className="container">
          <span className="eyebrow">هتل‌های منبع‌دار</span>
          <h1>هتل را با داستان آدم‌ها کشف کنید</h1>
          <p>
            نتایج فقط شامل هتل‌هایی است که حداقل یک ارتباط تأییدشده و دارای
            منبع دارند.
          </p>
          <form className="filter-bar" method="get">
            <label>
              <span>نام هتل یا شهر</span>
              <input name="query" defaultValue={query} placeholder="مثلاً هتل یا تهران" />
            </label>
            <label>
              <span>شهر</span>
              <input name="city" defaultValue={city} placeholder="همه شهرها" />
            </label>
            <button className="button" type="submit">
              اعمال فیلتر
            </button>
          </form>
        </div>
      </section>

      <section className="section container listing-results">
        <div className="results-header">
          <div>
            <span className="section-eyebrow">نتایج جست‌وجو</span>
            <h2>هتل‌های قابل نمایش</h2>
          </div>
          {result.ok ? (
            <span>{result.value.meta.total.toLocaleString("fa-IR")} نتیجه</span>
          ) : null}
        </div>

        {result.ok && result.value.data.length > 0 ? (
          <div className="card-grid">
            {result.value.data.map((hotel) => (
              <HotelCard hotel={hotel} key={hotel.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            kind={result.ok ? "empty" : "unavailable"}
            title={result.ok ? "هتلی با این فیلتر پیدا نشد" : "API در دسترس نیست"}
            description={
              result.ok
                ? "فیلترها را تغییر دهید یا پس از انتشار داده‌های تأییدشده دوباره سر بزنید."
                : "برای نمایش داده‌ها، ابتدا بک‌اند را با pnpm api:dev اجرا کنید."
            }
          />
        )}
      </section>
    </main>
  );
}
