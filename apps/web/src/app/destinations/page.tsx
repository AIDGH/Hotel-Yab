import type { Metadata } from "next";

import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { DestinationCard } from "@/components/destination-card";
import { EmptyState } from "@/components/empty-state";
import destinations from "@/data/destinations.json";

export const metadata: Metadata = {
  title: "کشف مقصدها",
  description: "شهرها و استان‌های ایران را برای سفر کشف کنید.",
};

type DestinationsPageProps = {
  searchParams: Promise<{
    query?: string;
    type?: "cities" | "provinces";
    province?: string;
  }>;
};

export default async function DestinationsPage({
  searchParams,
}: DestinationsPageProps) {
  const params = await searchParams;

  const query = params.query?.trim() ?? "";
  const type = params.type ?? "cities";
  const selectedProvince = params.province ?? "";

  const provinceMap = new Map(
    destinations.provinces.map((province) => [
      province.slug,
      province.name,
    ]),
  );

  const filteredCities = destinations.cities.filter((city) => {
    const provinceName =
      provinceMap.get(city.parentProvinceSlug) ?? "";

    const matchesQuery =
      !query ||
      city.name.includes(query) ||
      provinceName.includes(query);

    const matchesProvince =
      !selectedProvince ||
      city.parentProvinceSlug === selectedProvince;

    return matchesQuery && matchesProvince;
  });

  const filteredProvinces = destinations.provinces.filter(
    (province) => !query || province.name.includes(query),
  );

  const resultCount =
    type === "cities"
      ? filteredCities.length
      : filteredProvinces.length;

  return (
    <main className="listing-page">
      <section className="page-hero page-hero-compact">
        <div className="container">
          <span className="eyebrow">مقصدهای سفر</span>

          <h1>مقصد بعدی‌تان را کشف کنید</h1>

          <p>
            شهرها و استان‌ها را از مسیر تجربه‌ها و محتوای سفر
            کشف کنید.
          </p>

          <form
            className={`filter-bar filter-bar-destinations filter-bar-destinations-${type}`}
            method="get"
          >
            <label>
              <span>جست‌وجوی مقصد</span>

              <input
                name="query"
                defaultValue={query}
                placeholder="مثلاً مشهد، شیراز یا خراسان رضوی"
              />
            </label>

            <label>
              <span>نوع مقصد</span>

              <AutoSubmitSelect
                name="type"
                defaultValue={type}
              >
                <option value="cities">شهرها</option>
                <option value="provinces">استان‌ها</option>
              </AutoSubmitSelect>
            </label>

            {type === "cities" && (
              <label>
                <span>استان</span>

                <AutoSubmitSelect
                  name="province"
                  defaultValue={selectedProvince}
                >
                  <option value="">همه استان‌ها</option>

                  {destinations.provinces.map((province) => (
                    <option
                      key={province.slug}
                      value={province.slug}
                    >
                      {province.name}
                    </option>
                  ))}
                </AutoSubmitSelect>
              </label>
            )}

            <button className="button" type="submit">
              اعمال فیلتر
            </button>
          </form>
        </div>
      </section>

      <section className="section container listing-results">
        <div className="results-header">
          <div>
            <span className="section-eyebrow">
              {type === "cities" ? "شهرها" : "استان‌ها"}
            </span>

            <h2>
              {type === "cities"
                ? "شهرهای قابل کشف"
                : "استان‌های قابل کشف"}
            </h2>
          </div>

          <span>
            {resultCount}{" "}
            {type === "cities" ? "شهر" : "استان"}
          </span>
        </div>

        {type === "cities" ? (
          filteredCities.length > 0 ? (
            <div className="card-grid">
              {filteredCities.map((city) => (
                <DestinationCard
                  key={city.slug}
                  name={city.name}
                  href={`/destinations/cities/${city.slug}`}
                  subtitle={
                    provinceMap.get(
                      city.parentProvinceSlug,
                    ) ?? ""
                  }
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
          )
        ) : filteredProvinces.length > 0 ? (
          <div className="card-grid">
            {filteredProvinces.map((province) => (
              <DestinationCard
                key={province.slug}
                name={province.name}
                href={`/destinations/provinces/${province.slug}`}
                subtitle="استان"
                imageUrl={province.imageUrl}
                description={province.description}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            kind="empty"
            title="استانی پیدا نشد"
            description="عبارت جست‌وجو را تغییر دهید."
          />
        )}
      </section>
    </main>
  );
}
