import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { MediaTile } from "@/components/media-tile";
import { SourceList } from "@/components/source-list";
import { getHotel } from "@/lib/api";
import { associationLabel, formatDate } from "@/lib/labels";

export const dynamic = "force-dynamic";

type HotelPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: HotelPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getHotel(slug);

  return {
    title: result.ok ? result.value.data.name : "جزئیات هتل",
  };
}

export default async function HotelPage({ params }: HotelPageProps) {
  const { slug } = await params;
  const result = await getHotel(slug);

  if (!result.ok && result.status === 404) notFound();

  if (!result.ok) {
    return (
      <main className="detail-page container">
        <EmptyState
          kind="unavailable"
          title="اطلاعات هتل در دسترس نیست"
          description="ارتباط با API برقرار نشد. پس از اجرای بک‌اند دوباره تلاش کنید."
        />
      </main>
    );
  }

  const hotel = result.value.data;

  return (
    <main className="detail-page">
      <section className="container detail-hero">
        <div className="detail-media">
          <MediaTile imageUrl={hotel.imageUrl} label={hotel.name} variant="hotel" />
        </div>
        <div className="detail-heading">
          <Link className="back-link" href="/hotels">
            بازگشت به هتل‌ها ←
          </Link>
          <span className="verified-badge verified-badge-static">
            <span>✓</span>
            دارای ارتباط تأییدشده
          </span>
          <h1>{hotel.name}</h1>
          <p className="detail-location">⌖ {hotel.city}</p>
          <p>
            {hotel.description ??
              "اطلاعات این هتل بر پایه‌ی رابطه‌های بررسی‌شده و منابع قابل پیگیری نمایش داده می‌شود."}
          </p>
          <div className="detail-actions">
            {hotel.websiteUrl ? (
              <a className="button" href={hotel.websiteUrl} target="_blank" rel="noreferrer">
                وب‌سایت هتل
              </a>
            ) : null}
            <span>{hotel.associations.length.toLocaleString("fa-IR")} ارتباط مستند</span>
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container detail-content">
          <div className="detail-main">
            <span className="section-eyebrow">ردپای چهره‌ها</span>
            <h2>چه کسانی با این هتل ارتباط داشته‌اند؟</h2>
            <div className="association-list">
              {hotel.associations.map((association) => (
                <article className="association-card" key={association.id}>
                  <div className="association-person">
                    <MediaTile
                      imageUrl={association.notablePerson.imageUrl}
                      label={association.notablePerson.displayName}
                      variant="person"
                    />
                    <div>
                      <span>{associationLabel(association.type)}</span>
                      <h3>
                        <Link href={`/notable-people/${association.notablePerson.slug}`}>
                          {association.notablePerson.displayName}
                        </Link>
                      </h3>
                      <p>{association.summary}</p>
                    </div>
                  </div>
                  <div className="verification-row">
                    <span>✓ تأییدشده</span>
                    {association.verifiedAt ? (
                      <small>بررسی در {formatDate(association.verifiedAt)}</small>
                    ) : null}
                  </div>
                  <SourceList sources={association.sources} />
                </article>
              ))}
            </div>
          </div>
          <aside className="detail-aside">
            <h3>چرا این اطلاعات قابل اعتماد است؟</h3>
            <p>
              هر ارتباط قبل از انتشار باید وضعیت تأییدشده و حداقل یک منبع
              قابل بازبینی داشته باشد.
            </p>
            <ul>
              <li>منبع مستقیم یا رسانه‌ای</li>
              <li>زمان آخرین بررسی</li>
              <li>تفکیک ادعا از واقعیت تأییدشده</li>
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
