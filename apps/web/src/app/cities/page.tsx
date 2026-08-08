import type { Metadata } from "next";

import { CityCard } from "@/components/city-card";
import { EmptyState } from "@/components/empty-state";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import cities from "@/data/cities.json";

export const metadata: Metadata = {
  title: "کشف شهرها",
  description: "شهرها را از مسیر سفرها و محتوای چهره‌ها کشف کنید.",
};

type CitiesPageProps = {
  searchParams: Promise<{
    query?: string;
    province?: string;
  }>;
};

export default async function CitiesPage({
  searchParams,
}: CitiesPageProps) {
  const params = await searchParams;

  const query = params.query?.trim() ?? "";
  const province = params.province ?? "";

  const provinces = [...new Set(cities.map((city) => city.province))];

  const filteredCities = cities.filter((city) => {
    const matchesQuery =
      !query ||
      city.name.includes(query) ||
      city.province.includes(query);

    const matchesProvince =
      !province || city.province === province;

    return matchesQuery && matchesProvince;
  });

  return (
    <main className="listing-page">
      <section className="page-hero page-hero-compact">
        <div className="container">
          <span className="eyebrow">فهرست شهرها</span>

          <h1>شهرها را از نگاه آدم‌ها کشف کنید</h1>

          <p>
            مقصدها، سفرها و ویدیوهای چهره‌ها از نقاط دیدنی هر شهر را یکجا ببینید.
          </p>

          <form className="filter-bar" method="get">
            <label>
              <span>نام شهر</span>
              <input
                name="query"
                defaultValue={query}
                placeholder="مثلاً شیراز، اصفهان یا کیش"
              />
            </label>

            <label>
              <span>استان</span>

              <AutoSubmitSelect name="province" defaultValue={province}>
                <option value="">همه استان‌ها</option>

                {provinces.map((provinceName) => (
                  <option key={provinceName} value={provinceName}>
                    {provinceName}
                  </option>
                ))}
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
            <span className="section-eyebrow">شهرها</span>
            <h2>مقصدهای قابل نمایش</h2>
          </div>

          <span>{filteredCities.length} شهر</span>
        </div>

        {filteredCities.length > 0 ? (
          <div className="card-grid">
            {filteredCities.map((city) => (
              <CityCard
                key={city.slug}
                name={city.name}
                slug={city.slug}
                province={city.province}
                imageUrl={city.imageUrl}
                description={city.description}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            kind="empty"
            title="شهری پیدا نشد"
            description="عبارت جست‌وجو یا استان انتخاب‌شده را تغییر دهید."
          />
        )}
      </section>
    </main>
  );
}