import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { HotelCard } from "@/components/hotel-card";
import { ProgressiveVideoList } from "@/components/progressive-video-list";
import { TravelVideoCard } from "@/components/travel-video-card";
import { TravelVideoPersonCard } from "@/components/travel-video-person-card";
import { getDestinationCatalog } from "@/lib/destination-catalog";
import {
  getHotels,
  getNotablePersonByInstagramUsername,
} from "@/lib/api";
import { getTravelVideosForDestination } from "@/lib/travel-videos";

type DestinationPageProps = {
  params: Promise<{
    type: string;
    slug: string;
  }>;
};

export default async function DestinationPage({
  params,
}: DestinationPageProps) {
  const { type, slug } = await params;
  const destinations = await getDestinationCatalog();

  if (type !== "cities" && type !== "provinces") {
    notFound();
  }

  const isCity = type === "cities";

  const destination = isCity
    ? destinations.cities.find((item) => item.slug === slug)
    : destinations.provinces.find((item) => item.slug === slug);

  if (!destination) {
    notFound();
  }

  const province = isCity
    ? destinations.provinces.find(
        (item) =>
          item.slug ===
          destinations.cities.find(
            (city) => city.slug === slug,
          )?.parentProvinceSlug,
      )
    : null;

  const destinationType = isCity ? "CITY" : "PROVINCE";

  const destinationVideos = await getTravelVideosForDestination(
    destinationType,
    slug,
  );
  const uniqueInstagramUsernames = [
    ...new Set(destinationVideos.map((video) => video.instagramUsername)),
  ];
  const destinationHotelCities = isCity
    ? [destination.name]
    : destinations.cities
        .filter((city) => city.parentProvinceSlug === destination.slug)
        .map((city) => city.name);
  const [people, hotelResults] = await Promise.all([
    Promise.all(
      uniqueInstagramUsernames.map(async (instagramUsername) => [
        instagramUsername,
        await getNotablePersonByInstagramUsername(instagramUsername),
      ] as const),
    ),
    Promise.all(
      destinationHotelCities.map((city) =>
        getHotels({ city, sort: "NAME_ASC", pageSize: 100 }),
      ),
    ),
  ]);
  const peopleByInstagramUsername = new Map(people);
  const hotelsAvailable = hotelResults.every((result) => result.ok);
  const relatedHotels = hotelsAvailable
    ? [
        ...new Map(
          hotelResults
            .flatMap((result) => (result.ok ? result.value.data : []))
            .map((hotel) => [hotel.id, hotel] as const),
        ).values(),
      ].sort((firstHotel, secondHotel) =>
        firstHotel.name.localeCompare(secondHotel.name, "fa"),
      )
    : [];
  const destinationKindLabel = isCity ? "شهر" : "استان";

  return (
    <main className="detail-page destination-detail-page">
      <section className="destination-detail-hero">
        <div
          className="destination-detail-hero-image"
          style={{
            backgroundImage: `url("${destination.imageUrl}")`,
          }}
        >
          <div className="destination-detail-hero-overlay">
            <div className="container">
              <span className="eyebrow">
                {isCity
                  ? province?.name ?? "شهر"
                  : "استان"}
              </span>

              <h1>{destination.name}</h1>

              {destination.description && (
                <p>{destination.description}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="results-header">
          <div>
            <span className="section-eyebrow">
              ویدیوهای سفر
            </span>

            <h2>
              تجربه سفر به {destination.name}
            </h2>
          </div>
        </div>

        {destinationVideos.length > 0 ? (
          <ProgressiveVideoList
            className="destination-video-list"
            key={`${destinationType}:${slug}`}
          >
            {destinationVideos.map((video) => (
              <div className="destination-video-item" key={video.videoId}>
                <TravelVideoPersonCard
                  instagramUsername={video.instagramUsername}
                  person={
                    peopleByInstagramUsername.get(video.instagramUsername) ??
                    null
                  }
                />
                <TravelVideoCard
                  videoId={video.videoId}
                  title={video.title}
                  mediaUrl={video.mediaUrl}
                  thumbnailUrl={video.thumbnailUrl}
                  sourceUrl={video.sourceUrl}
                  instagramUsername={video.instagramUsername}
                />
              </div>
            ))}
          </ProgressiveVideoList>
        ) : (
          <EmptyState
            kind="empty"
            title="هنوز ویدیوی سفری ثبت نشده است"
            description={`به‌زودی ویدیوهای مربوط به ${destination.name} در این صفحه نمایش داده می‌شوند.`}
          />
        )}
      </section>

      <section className="section container destination-hotels-section">
        <div className="results-header">
          <div>
            <span className="section-eyebrow">اقامت در مقصد</span>
            <h2>
              هتل‌های {destinationKindLabel} {destination.name}
            </h2>
          </div>
          {hotelsAvailable ? (
            <span>{relatedHotels.length.toLocaleString("fa-IR")} هتل</span>
          ) : null}
        </div>

        {hotelsAvailable && relatedHotels.length > 0 ? (
          <div className="card-grid">
            {relatedHotels.map((hotel) => (
              <HotelCard hotel={hotel} key={hotel.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            kind={hotelsAvailable ? "empty" : "unavailable"}
            title={
              hotelsAvailable
                ? `هنوز هتلی برای ${destinationKindLabel} ${destination.name} ثبت نشده است`
                : "اطلاعات هتل‌ها در دسترس نیست"
            }
            description={
              hotelsAvailable
                ? `هنوز هتل منتشرشده‌ای برای ${destinationKindLabel} ${destination.name} ثبت نشده است.`
                : "برای نمایش هتل‌های این مقصد، ارتباط با API را بررسی کنید."
            }
          />
        )}
      </section>
    </main>
  );
}
