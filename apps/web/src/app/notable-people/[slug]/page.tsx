import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { EntityLibraryActions } from "@/components/entity-library-actions";
import { MediaTile } from "@/components/media-tile";
import { PersonDisplayName } from "@/components/person-display-name";
import { PersonProfileMeta } from "@/components/person-profile-meta";
import { SourceList } from "@/components/source-list";
import { TravelVideoCard } from "@/components/travel-video-card";
import { VideoDestinationLinks } from "@/components/video-destination-links";
import { getNotablePerson } from "@/lib/api";
import {
  associationLabel,
  categoryLabel,
  formatDate,
} from "@/lib/labels";
import { getTravelVideosForInstagramUsername } from "@/lib/travel-videos";

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
  const personTravelVideos = await getTravelVideosForInstagramUsername(
    person.instagramHandle,
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
          <h1>
            <PersonDisplayName name={person.displayName} />
          </h1>
          <PersonProfileMeta
            className="detail-location"
            instagramHandle={person.instagramHandle}
            occupation={person.occupation}
            followerCount={person.followerCount}
            primaryCategory={person.primaryCategory}
          />
          <p>
            {person.biography ??
              "هتل‌های مرتبط با این فرد نمایش داده می‌شوند و وضعیت بررسی هر رابطه به‌صورت شفاف مشخص است."}
          </p>
          <div className="detail-actions">
            <EntityLibraryActions
              entity="notable-person"
              slug={person.slug}
              label={person.displayName}
              variant="detail"
            />
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

      <section className="section container person-video-section">
        <div className="results-header">
          <div>
            <span className="section-eyebrow">ویدیوهای سفر</span>
            <h2>سفرهای ثبت‌شده این چهره</h2>
          </div>
          {personTravelVideos.length > 0 ? (
            <span>
              {personTravelVideos.length.toLocaleString("fa-IR")} ویدیو
            </span>
          ) : null}
        </div>

        {personTravelVideos.length > 0 ? (
          <div className="person-video-list">
            {personTravelVideos.map(({ video, destinations: videoDestinations }) => (
              <div className="person-video-item" key={video.videoId}>
                <TravelVideoCard
                  videoId={video.videoId}
                  title={video.title}
                  mediaUrl={video.mediaUrl}
                  thumbnailUrl={video.thumbnailUrl}
                  sourceUrl={video.sourceUrl}
                  instagramUsername={video.instagramUsername}
                />
                <VideoDestinationLinks destinations={videoDestinations} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            kind="empty"
            title="ویدیوی سفری برای این چهره ثبت نشده"
            description="پس از اتصال ویدیو به نام کاربری اینستاگرام، مقصدهای مرتبط آن در این بخش نمایش داده می‌شوند."
          />
        )}
      </section>
    </main>
  );
}
