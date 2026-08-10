import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { TravelVideoCard } from "@/components/travel-video-card";
import { TravelVideoPersonCard } from "@/components/travel-video-person-card";
import destinations from "@/data/destinations.json";
import { getNotablePersonByInstagramUsername } from "@/lib/api";
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

  const destinationVideos = getTravelVideosForDestination(
    destinationType,
    slug,
  );
  const uniqueInstagramUsernames = [
    ...new Set(destinationVideos.map((video) => video.instagramUsername)),
  ];
  const people = await Promise.all(
    uniqueInstagramUsernames.map(async (instagramUsername) => [
      instagramUsername,
      await getNotablePersonByInstagramUsername(instagramUsername),
    ] as const),
  );
  const peopleByInstagramUsername = new Map(people);

  return (
    <main>
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
          <div className="destination-video-list">
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
          </div>
        ) : (
          <EmptyState
            kind="empty"
            title="ویدیوهای سفر در حال تکمیل است"
            description={`به‌زودی ویدیوهای مربوط به ${destination.name} در این صفحه نمایش داده می‌شوند.`}
          />
        )}
      </section>
    </main>
  );
}
