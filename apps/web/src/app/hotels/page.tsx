import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { HotelCard } from "@/components/hotel-card";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { getHotels } from "@/lib/api";
import Link from "next/link";

export const metadata: Metadata = {
  title: "کشف هتل‌ها",
  description: "فهرست هتل‌ها و ارتباط‌های مستند و تأییدشده‌ی آن‌ها.",
};

export const dynamic = "force-dynamic";

type HotelsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function createHotelsPageHref(
  currentParams: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(currentParams)) {
    const normalizedValue = readParam(value);

    if (key !== "page" && normalizedValue) {
      nextParams.set(key, normalizedValue);
    }
  }

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  const queryString = nextParams.toString();

  return queryString ? `/hotels?${queryString}` : "/hotels";
}

export default async function HotelsPage({ searchParams }: HotelsPageProps) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(readParam(params.page), 10);
  
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
      
  const query = readParam(params.query);
  const city = readParam(params.city);
  const sort = readParam(params.sort) || "NAME_ASC";
  const result = await getHotels({ query, city, sort, pageSize: 9, page });

  return (
    <main className="listing-page">
      <section className="page-hero page-hero-compact">
        <div className="container">
          <span className="eyebrow">فهرست هتل‌ها</span>
          <h1>هتل را با داستان آدم‌ها کشف کنید</h1>
          <p>
            همه‌ی هتل‌های منتشرشده را ببینید؛ ارتباط با چهره‌ها فقط پس از
            تأیید و ثبت منبع نمایش داده می‌شود.
          </p>
          <form className="filter-bar filter-bar-four" method="get">
            <label>
              <span>نام هتل یا شهر</span>
              <input name="query" defaultValue={query} placeholder="مثلاً هتل یا تهران" />
            </label>
            <label>
              <span>شهر</span>
              <input name="city" defaultValue={city} placeholder="همه شهرها" />
            </label>
            <label>
              <span>مرتب‌سازی</span>
              <AutoSubmitSelect name="sort" defaultValue={sort}>
                <option value="NAME_ASC">الفبا</option>
                <option value="CITY_ASC">شهر</option>
              </AutoSubmitSelect>
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
          <>
            <div className="card-grid">
              {result.value.data.map((hotel) => (
                <HotelCard hotel={hotel} key={hotel.id} />
              ))}
            </div>

            {result.value.meta.totalPages > 1 ? (
              <nav className="pagination" aria-label="صفحه‌بندی هتل‌ها">
                {page > 1 ? (
                  <Link
                    className="button pagination-secondary"
                    href={createHotelsPageHref(params, page - 1)}
                  >
                    صفحه قبل
                  </Link>
                ) : (
                  <span aria-hidden="true" />
                )}

                <span>
                  صفحه {page.toLocaleString("fa-IR")} از{" "}
                  {result.value.meta.totalPages.toLocaleString("fa-IR")}
                </span>

                {page < result.value.meta.totalPages ? (
                  <Link
                    className="button pagination-secondary"
                    href={createHotelsPageHref(params, page + 1)}
                  >
                    صفحه بعد
                  </Link>
                ) : (
                  <span aria-hidden="true" />
                )}
              </nav>
            ) : null}
          </>
        ) : (
          <EmptyState
            kind={result.ok ? "empty" : "unavailable"}
            title={result.ok ? "هتلی با این فیلتر پیدا نشد" : "API در دسترس نیست"}
            description={
              result.ok
                ? "فیلترها را تغییر دهید و دوباره جست‌وجو کنید."
                : "برای نمایش داده‌ها، ابتدا بک‌اند را با pnpm api:dev اجرا کنید."
            }
          />
        )}
      </section>
    </main>
  );
}
