import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { MediaTile } from "@/components/media-tile";
import { PersonDisplayName } from "@/components/person-display-name";
import { PersonInstagramHandle } from "@/components/person-instagram-handle";
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
  const hasAssociations = hotel.associations.length > 0;
  const hasVerifiedAssociations = hotel.associations.some(
    ({ verificationStatus }) => verificationStatus === "VERIFIED",
  );

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
          <span
            className={`status-badge status-badge-static${
              hasVerifiedAssociations ? "" : " status-badge-neutral"
            }`}
          >
            <span>{hasVerifiedAssociations ? "✓" : "◇"}</span>
            {hasVerifiedAssociations
              ? "دارای ارتباط تأییدشده"
              : "روابط در حال بررسی"}
          </span>
          <h1>{hotel.name}</h1>
          <p className="detail-location">⌖ {hotel.city}</p>
          <p>
            {hotel.description ??
              (hasAssociations
                ? "افراد مرتبط با این هتل نمایش داده می‌شوند و وضعیت بررسی هر رابطه به‌صورت شفاف مشخص است."
                : "این هتل در فهرست عمومی ثبت شده و ارتباط‌های آن در حال بررسی و منبع‌دهی است.")}
          </p>
          <div className="detail-actions">
            {hotel.websiteUrl ? (
              <a className="button" href={hotel.websiteUrl} target="_blank" rel="noreferrer">
                صفحه رسمی هتل
              </a>
            ) : null}
            <span>{hotel.associations.length.toLocaleString("fa-IR")} چهره مرتبط</span>
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container detail-content">
          <div className="detail-main">
            <span className="section-eyebrow">ردپای چهره‌ها</span>
            <h2>چه کسانی با این هتل ارتباط داشته‌اند؟</h2>
            {hasAssociations ? (
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
                            <PersonDisplayName
                              name={association.notablePerson.displayName}
                            />
                          </Link>
                        </h3>
                        {association.notablePerson.instagramHandle ? (
                          <PersonInstagramHandle
                            handle={association.notablePerson.instagramHandle}
                          />
                        ) : null}
                        <p>{association.summary}</p>
                      </div>
                    </div>
                    <div className="verification-row">
                      <span
                        className={
                          association.verificationStatus === "VERIFIED"
                            ? ""
                            : "verification-pending"
                        }
                      >
                        {association.verificationStatus === "VERIFIED"
                          ? "✓ تأییدشده"
                          : "◇ در حال تکمیل"}
                      </span>
                      <small>
                        {association.verifiedAt
                          ? `بررسی در ${formatDate(association.verifiedAt)}`
                          : "هنوز تأیید نهایی نشده"}
                      </small>
                    </div>
                    <SourceList sources={association.sources} />
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                kind="empty"
                title="هنوز رابطه‌ی تأییدشده‌ای منتشر نشده"
                description="رابطه‌ها پس از ثبت منبع و تکمیل بررسی در این بخش نمایش داده می‌شوند."
              />
            )}
          </div>
          <aside className="detail-aside">
            <h3>وضعیت هر ارتباط شفاف است</h3>
            <p>
              رابطه‌های اولیه با نشان «در حال تکمیل» منتشر می‌شوند و تا قبل
              از بررسی نهایی، تأییدشده محسوب نمی‌شوند.
            </p>
            <ul>
              <li>جای مشخص برای عکس، ویدئو یا لینک</li>
              <li>نشان جداگانه برای رابطهٔ تأییدشده</li>
              <li>عدم نمایش رابطه‌های ردشده</li>
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
