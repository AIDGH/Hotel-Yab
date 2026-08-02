import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { MediaTile } from "@/components/media-tile";
import { SourceList } from "@/components/source-list";
import { getNotablePerson } from "@/lib/api";
import { associationLabel, categoryLabel, formatDate } from "@/lib/labels";

export const dynamic = "force-dynamic";

type PersonPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PersonPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getNotablePerson(slug);

  return {
    title: result.ok ? result.value.data.displayName : "جزئیات چهره",
  };
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { slug } = await params;
  const result = await getNotablePerson(slug);

  if (!result.ok && result.status === 404) notFound();

  if (!result.ok) {
    return (
      <main className="detail-page container">
        <EmptyState
          kind="unavailable"
          title="اطلاعات این چهره در دسترس نیست"
          description="ارتباط با API برقرار نشد. پس از اجرای بک‌اند دوباره تلاش کنید."
        />
      </main>
    );
  }

  const person = result.value.data;
  const hasVerifiedAssociations = person.associations.some(
    ({ verificationStatus }) => verificationStatus === "VERIFIED",
  );

  return (
    <main className="detail-page">
      <section className="container detail-hero detail-hero-person">
        <div className="detail-media detail-media-person">
          <MediaTile imageUrl={person.imageUrl} label={person.displayName} variant="person" />
        </div>
        <div className="detail-heading">
          <Link className="back-link" href="/notable-people">
            بازگشت به چهره‌ها ←
          </Link>
          <span className="section-eyebrow">{categoryLabel(person.primaryCategory)}</span>
          <h1>{person.displayName}</h1>
          <p className="detail-location">{person.occupation ?? "چهره شناخته‌شده"}</p>
          <p>
            {person.biography ??
              "هتل‌های مرتبط با این فرد نمایش داده می‌شوند و وضعیت بررسی هر رابطه به‌صورت شفاف مشخص است."}
          </p>
          <div className="detail-actions">
            <span>{person.associations.length.toLocaleString("fa-IR")} هتل مرتبط</span>
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container detail-content">
          <div className="detail-main">
            <span className="section-eyebrow">هتل‌های مرتبط</span>
            <h2>
              {hasVerifiedAssociations
                ? "ارتباط‌های این چهره"
                : "ارتباط‌های در حال تکمیل این چهره"}
            </h2>
            <div className="association-list">
              {person.associations.map((association) => (
                <article className="association-card" key={association.id}>
                  <div className="association-person association-hotel">
                    <MediaTile
                      imageUrl={association.hotel.imageUrl}
                      label={association.hotel.name}
                      variant="hotel"
                    />
                    <div>
                      <span>{associationLabel(association.type)}</span>
                      <h3>
                        <Link href={`/hotels/${association.hotel.slug}`}>
                          {association.hotel.name}
                        </Link>
                      </h3>
                      <small>⌖ {association.hotel.city}</small>
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
          </div>
          <aside className="detail-aside">
            <h3>ویدیو هم یک مدرک است</h3>
            <p>
              اگر منبع رابطه پست یا ویدیو باشد، در کارت منبع با نشانه‌ی پخش
              مشخص می‌شود و کاربر مستقیماً به محتوای اصلی می‌رود.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
