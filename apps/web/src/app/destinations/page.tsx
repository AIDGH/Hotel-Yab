import type { Metadata } from "next";

import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { AutoSubmitInput } from "@/components/auto-submit-input";
import { DestinationCard } from "@/components/destination-card";
import { EmptyState } from "@/components/empty-state";
import { getDestinationCatalog } from "@/lib/destination-catalog";
import { normalizePersianSearchText } from "@/lib/search-text";

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
  const destinations = await getDestinationCatalog();

  const query = params.query?.trim() ?? "";
  const normalizedQuery = normalizePersianSearchText(query);
  const isSearching = normalizedQuery.length > 0;
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
      normalizePersianSearchText(city.name).includes(normalizedQuery) ||
      normalizePersianSearchText(provinceName).includes(normalizedQuery);

    const matchesProvince =
      !selectedProvince ||
      city.parentProvinceSlug === selectedProvince;

    return matchesQuery && matchesProvince;
  });

  const filteredProvinces = destinations.provinces.filter(
    (province) =>
      !query || normalizePersianSearchText(province.name).includes(normalizedQuery),
  );

  const resultCount =
    isSearching
      ? filteredCities.length + filteredProvinces.length
      : type === "cities"
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

              <AutoSubmitInput
                name="query"
                defaultValue={query}
                placeholder="مثلاً مشهد، شیراز یا خراسان رضوی"
                autoComplete="off"
              />
            </label>

            <label>
              <span>نوع مقصد</span>

              <AutoSubmitSelect
                name="type"
                defaultValue={type}
              >
                <option value="cities">شهر</option>
                <option value="provinces">استان</option>
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
              {isSearching
                ? "شهرها و استان‌ها"
                : type === "cities"
                  ? "شهرها"
                  : "استان‌ها"}
            </span>

            <h2>
              {isSearching
                ? `نتیجه‌های مرتبط با «${query}»`
                : type === "cities"
                ? "شهرهای قابل کشف"
                : "استان‌های قابل کشف"}
            </h2>
          </div>

          <span>
            {resultCount}{" "}
            {isSearching ? "مقصد" : type === "cities" ? "شهر" : "استان"}
          </span>
        </div>

        {isSearching ? (
          resultCount > 0 ? (
            <div className="card-grid">
              {filteredCities.map((city) => (
                <DestinationCard
                  key={`city:${city.slug}`}
                  name={city.name}
                  href={`/destinations/cities/${city.slug}`}
                  subtitle={provinceMap.get(city.parentProvinceSlug) ?? "شهر"}
                  imageUrl={city.imageUrl}
                  description={city.description}
                />
              ))}

              {filteredProvinces.map((province) => (
                <DestinationCard
                  key={`province:${province.slug}`}
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
              title="مقصدی پیدا نشد"
              description="عبارت جست‌وجو یا استان انتخاب‌شده را تغییر دهید."
            />
          )
        ) : type === "cities" ? (
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
