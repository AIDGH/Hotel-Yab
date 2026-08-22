import type { Metadata } from "next";
import Link from "next/link";

import { DestinationCard } from "@/components/destination-card";
import { EmptyState } from "@/components/empty-state";
import { HotelCard } from "@/components/hotel-card";
import { PersonCard } from "@/components/person-card";
import { getHotels, getNotablePeople } from "@/lib/api";
import { getDestinationCatalog } from "@/lib/destination-catalog";
import { LiveSearchForm } from "@/components/live-search-form";
import { normalizePersianSearchText } from "@/lib/search-text";

export const metadata: Metadata = {
  title: "جست‌وجوی هتل‌یاب",
  description: "جست‌وجوی یکپارچه میان هتل‌ها، چهره‌ها، شهرها و استان‌ها.",
};

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{ query?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.query?.trim() ?? "";
  const normalizedQuery = normalizePersianSearchText(query);
  const destinations = await getDestinationCatalog();
  const searchResults = query
    ? await Promise.all([
        getHotels({ query, pageSize: 6 }),
        getNotablePeople({ query, pageSize: 8 }),
      ])
    : null;
  const hotelsResult = searchResults?.[0] ?? null;
  const peopleResult = searchResults?.[1] ?? null;
  const provinceMap = new Map(
    destinations.provinces.map((province) => [province.slug, province.name]),
  );
  const destinationResults = query
    ? [
        ...destinations.cities
          .filter((city) =>
            [
              city.name,
              city.description,
              provinceMap.get(city.parentProvinceSlug) ?? "",
            ].some((value) =>
              normalizePersianSearchText(value).includes(normalizedQuery),
            ),
          )
          .map((city) => ({
            key: `cities-${city.slug}`,
            name: city.name,
            href: `/destinations/cities/${city.slug}`,
            subtitle: provinceMap.get(city.parentProvinceSlug) ?? "شهر",
            imageUrl: city.imageUrl,
            description: city.description,
          })),
        ...destinations.provinces
          .filter((province) =>
            [province.name, province.description].some((value) =>
              normalizePersianSearchText(value).includes(normalizedQuery),
            ),
          )
          .map((province) => ({
            key: `provinces-${province.slug}`,
            name: province.name,
            href: `/destinations/provinces/${province.slug}`,
            subtitle: "استان",
            imageUrl: province.imageUrl,
            description: province.description,
          })),
      ]
    : [];
  const hotelItems = hotelsResult?.ok ? hotelsResult.value.data : [];
  const peopleItems = peopleResult?.ok ? peopleResult.value.data : [];
  const apiResultsAvailable = Boolean(hotelsResult?.ok && peopleResult?.ok);
  const hasAnyResult =
    hotelItems.length > 0 ||
    peopleItems.length > 0 ||
    destinationResults.length > 0;
  const totalResults = apiResultsAvailable
    ? (hotelsResult?.ok ? hotelsResult.value.meta.total : 0) +
      (peopleResult?.ok ? peopleResult.value.meta.total : 0) +
      destinationResults.length
    : null;

  return (
    <main className="listing-page global-search-page">
      <section className="page-hero page-hero-compact">
        <div className="container">
          <span className="eyebrow">جست‌وجوی هتل‌یاب</span>
          <h1>هتل، چهره یا مقصد را یکجا پیدا کنید</h1>
          <p>
            یک عبارت بنویسید تا نتیجه‌های مرتبط از همه بخش‌های هتل‌یاب
            کنار هم نمایش داده شوند.
          </p>
          <LiveSearchForm variant="results" initialQuery={query} />
        </div>
      </section>

      <section className="section container listing-results">
        {!query ? (
          <EmptyState
            kind="empty"
            title="دنبال چه چیزی هستید؟"
            description="نام هتل، چهره، شهر یا استان را در کادر بالا بنویسید."
          />
        ) : apiResultsAvailable && !hasAnyResult ? (
          <EmptyState
            kind="empty"
            title={`نتیجه‌ای برای «${query}» پیدا نشد`}
            description="املای عبارت را بررسی کنید یا نام کوتاه‌تری بنویسید."
          />
        ) : (
          <>
            <div className="results-header global-search-summary">
              <div>
                <span className="section-eyebrow">نتایج جست‌وجو</span>
                <h2>نتیجه‌های مرتبط با «{query}»</h2>
              </div>
              {totalResults !== null ? (
                <span>{totalResults.toLocaleString("fa-IR")} نتیجه</span>
              ) : null}
            </div>

            <div className="global-search-stack">
              {hotelsResult && !hotelsResult.ok ? (
                <SearchUnavailable title="هتل‌ها" />
              ) : hotelItems.length > 0 ? (
                <section className="global-search-group">
                  <SearchGroupHeader
                    eyebrow="هتل‌ها"
                    title="هتل‌های مرتبط"
                    count={hotelsResult?.ok ? hotelsResult.value.meta.total : 0}
                    href={`/hotels?query=${encodeURIComponent(query)}`}
                  />
                  <div className="card-grid">
                    {hotelItems.map((hotel) => (
                      <HotelCard hotel={hotel} key={hotel.id} />
                    ))}
                  </div>
                </section>
              ) : null}

              {peopleResult && !peopleResult.ok ? (
                <SearchUnavailable title="چهره‌ها" />
              ) : peopleItems.length > 0 ? (
                <section className="global-search-group">
                  <SearchGroupHeader
                    eyebrow="چهره‌ها"
                    title="چهره‌های مرتبط"
                    count={peopleResult?.ok ? peopleResult.value.meta.total : 0}
                    href={`/notable-people?query=${encodeURIComponent(query)}`}
                  />
                  <div className="people-grid">
                    {peopleItems.map((person) => (
                      <PersonCard person={person} key={person.id} />
                    ))}
                  </div>
                </section>
              ) : null}

              {destinationResults.length > 0 ? (
                <section className="global-search-group">
                  <SearchGroupHeader
                    eyebrow="مقصدها"
                    title="شهرها و استان‌های مرتبط"
                    count={destinationResults.length}
                    href={`/destinations?query=${encodeURIComponent(query)}`}
                  />
                  <div className="card-grid">
                    {destinationResults.map((destination) => (
                      <DestinationCard
                        key={destination.key}
                        name={destination.name}
                        href={destination.href}
                        subtitle={destination.subtitle}
                        imageUrl={destination.imageUrl}
                        description={destination.description}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function SearchGroupHeader({
  eyebrow,
  title,
  count,
  href,
}: {
  eyebrow: string;
  title: string;
  count: number;
  href: string;
}) {
  return (
    <div className="results-header">
      <div>
        <span className="section-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="global-search-group-actions">
        <span>{count.toLocaleString("fa-IR")} نتیجه</span>
        <Link className="text-link" href={href}>
          مشاهده همه <span>←</span>
        </Link>
      </div>
    </div>
  );
}

function SearchUnavailable({ title }: { title: string }) {
  return (
    <section className="global-search-group">
      <EmptyState
        kind="unavailable"
        title={`نتایج ${title} در دسترس نیست`}
        description="ارتباط با API برقرار نشد؛ سایر گروه‌های جست‌وجو همچنان نمایش داده می‌شوند."
      />
    </section>
  );
}
