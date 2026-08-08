import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import destinations from "@/data/destinations.json";

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

        <EmptyState
          kind="empty"
          title="ویدیوهای سفر در حال تکمیل است"
          description={`به‌زودی ویدیوهای مربوط به ${destination.name} در این صفحه نمایش داده می‌شوند.`}
        />
      </section>
    </main>
  );
}