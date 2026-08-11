import type { Metadata } from "next";

import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { EmptyState } from "@/components/empty-state";
import { ExploreVideoList } from "@/components/explore-video-list";
import { getNotablePersonByInstagramUsername } from "@/lib/api";
import { getDestinationCatalog } from "@/lib/destination-catalog";
import { getAllTravelVideos } from "@/lib/travel-videos";

export const metadata: Metadata = {
  title: "اکسپلور ویدیوهای سفر",
  description:
    "ویدیوهای سفر را از مسیر سازنده‌ها، شهرها و استان‌های مرتبط کشف کنید.",
};

export const dynamic = "force-dynamic";

type ExplorePageProps = {
  searchParams: Promise<{
    query?: string;
    destinationType?: "all" | "cities" | "provinces";
    destination?: string;
  }>;
};

export default async function ExplorePage({
  searchParams,
}: ExplorePageProps) {
  const params = await searchParams;
  const query = params.query?.trim() ?? "";
  const normalizedQuery = query.toLocaleLowerCase("fa-IR");
  const destinationType = params.destinationType ?? "all";
  const selectedDestination = params.destination ?? "";
  const [allTravelVideos, destinations] = await Promise.all([
    getAllTravelVideos(),
    getDestinationCatalog(),
  ]);

  const destinationOptions = [
    ...(destinationType === "all" || destinationType === "cities"
      ? destinations.cities.map((destination) => ({
          value: `cities:${destination.slug}`,
          label: `شهر ${destination.name}`,
        }))
      : []),
    ...(destinationType === "all" || destinationType === "provinces"
      ? destinations.provinces.map((destination) => ({
          value: `provinces:${destination.slug}`,
          label: `استان ${destination.name}`,
        }))
      : []),
  ];

  const filteredTravelVideos = allTravelVideos.filter(
    ({ video, destinations: videoDestinations }) => {
      const searchableValues = [
        video.title,
        video.instagramUsername,
        ...videoDestinations.map((destination) => destination.name),
      ];
      const matchesQuery =
        !normalizedQuery ||
        searchableValues.some((value) =>
          value.toLocaleLowerCase("fa-IR").includes(normalizedQuery),
        );
      const matchesType =
        destinationType === "all" ||
        videoDestinations.some(
          (destination) => destination.routeType === destinationType,
        );
      const matchesDestination =
        !selectedDestination ||
        videoDestinations.some(
          (destination) =>
            `${destination.routeType}:${destination.slug}` ===
            selectedDestination,
        );

      return matchesQuery && matchesType && matchesDestination;
    },
  );

  const uniqueInstagramUsernames = [
    ...new Set(
      filteredTravelVideos.map(({ video }) => video.instagramUsername),
    ),
  ];
  const people = await Promise.all(
    uniqueInstagramUsernames.map(async (instagramUsername) => [
      instagramUsername,
      await getNotablePersonByInstagramUsername(instagramUsername),
    ] as const),
  );
  const peopleByInstagramUsername = new Map(people);
  const exploreItems = filteredTravelVideos.map(
    ({ video, destinations: videoDestinations }) => ({
      video,
      destinations: videoDestinations,
      person:
        peopleByInstagramUsername.get(video.instagramUsername) ?? null,
    }),
  );

  return (
    <main className="listing-page explore-page">
      <section className="page-hero page-hero-compact explore-page-hero">
        <div className="container">
          <span className="eyebrow">اکسپلور ویدیوها</span>
          <h1>از یک ویدیو به مقصد بعدی برسید</h1>
          <p>
            تجربه‌های سفر را ببینید و از همان‌جا سازنده، شهرها و استان‌های
            مرتبط را کشف کنید.
          </p>

          <form className="filter-bar filter-bar-four" method="get">
            <label>
              <span>جست‌وجوی ویدیو</span>
              <input
                name="query"
                defaultValue={query}
                placeholder="عنوان، سازنده یا مقصد"
              />
            </label>
            <label>
              <span>نوع مقصد</span>
              <AutoSubmitSelect
                name="destinationType"
                defaultValue={destinationType}
                resetFields={["destination"]}
              >
                <option value="all">همه مقصدها</option>
                <option value="cities">شهرها</option>
                <option value="provinces">استان‌ها</option>
              </AutoSubmitSelect>
            </label>
            <label>
              <span>مقصد</span>
              <AutoSubmitSelect
                name="destination"
                defaultValue={selectedDestination}
              >
                <option value="">همه</option>
                {destinationOptions.map((destination) => (
                  <option key={destination.value} value={destination.value}>
                    {destination.label}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
            <button className="button" type="submit">
              جست‌وجو
            </button>
          </form>
        </div>
      </section>

      <section className="section container listing-results explore-results">
        <div className="results-header">
          <div>
            <span className="section-eyebrow">ویدیوهای سفر</span>
            <h2>تجربه‌های قابل کشف</h2>
          </div>
          <span>
            {filteredTravelVideos.length.toLocaleString("fa-IR")} ویدیو
          </span>
        </div>

        {filteredTravelVideos.length > 0 ? (
          <ExploreVideoList
            items={exploreItems}
            key={`${query}|${destinationType}|${selectedDestination}`}
          />
        ) : (
          <EmptyState
            kind="empty"
            title="ویدیویی با این فیلتر پیدا نشد"
            description="عبارت جست‌وجو یا مقصد را تغییر دهید و دوباره امتحان کنید."
          />
        )}
      </section>
    </main>
  );
}
