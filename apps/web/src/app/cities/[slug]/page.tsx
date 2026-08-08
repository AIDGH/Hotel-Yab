import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import cities from "@/data/cities.json";

type CityPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CityPage({ params }: CityPageProps) {
  const { slug } = await params;

  const city = cities.find((item) => item.slug === slug);

  if (!city) {
    notFound();
  }

  return (
    <main>
        <section className="city-detail-hero">
            <div
                className="city-detail-hero-image"
                style={{ backgroundImage: `url("${city.imageUrl}")` }}
            >
                <div className="city-detail-hero-overlay">
                    <div className="container">
                        <span className="eyebrow">{city.province}</span>

                        <h1>{city.name}</h1>

                        {city.description && <p>{city.description}</p>}
                    </div>
                </div>
            </div>
        </section>

      <section className="section container">
        <div className="results-header">
          <div>
            <span className="section-eyebrow">سفرها</span>
            <h2>چه کسانی به {city.name} سفر کرده‌اند؟</h2>
          </div>
        </div>

        <EmptyState
          kind="empty"
          title="اطلاعات سفرها در حال تکمیل است"
          description={`به‌زودی چهره‌ها و ویدیوهای سفر آن‌ها به ${city.name} در این صفحه نمایش داده می‌شوند.`}
        />
      </section>
    </main>
  );
}