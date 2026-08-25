import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { EntityLibraryActions } from "@/components/entity-library-actions";
import { HotelLogo } from "@/components/hotel-logo";
import { HotelReviews } from "@/components/hotel-reviews";
import { HotelStars } from "@/components/hotel-stars";
import { MediaTile } from "@/components/media-tile";
import { PersonDisplayName } from "@/components/person-display-name";
import { PersonInstagramHandle } from "@/components/person-instagram-handle";
import { compactPersonOccupation } from "@/components/person-occupation";
import { ProgressiveVideoList } from "@/components/progressive-video-list";
import { TravelVideoCard } from "@/components/travel-video-card";
import { TravelVideoPersonCard } from "@/components/travel-video-person-card";
import { SiteIcon } from "@/components/site-icon";
import { getHotel } from "@/lib/api";
import {
  categoryLabel,
  formatFollowerCount,
  formatPersianRating,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

type HotelPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: HotelPageProps): Promise<Metadata> {
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
  const peopleByInstagramHandle = new Map(
    hotel.associations.flatMap((association) => {
      const handle = normalizeInstagramHandle(
        association.notablePerson.instagramHandle,
      );
      return handle ? [[handle, association.notablePerson] as const] : [];
    }),
  );
  const videoCreatorHandles = new Set(
    hotel.videos.map((video) =>
      normalizeInstagramHandle(video.instagramUsername),
    ),
  );
  const guestAssociations = hotel.associations.filter((association) => {
    const handle = normalizeInstagramHandle(
      association.notablePerson.instagramHandle,
    );
    return !handle || !videoCreatorHandles.has(handle);
  });

  return (
    <main className="detail-page">
      <section className="container detail-hero detail-hero-hotel">
        <div className="detail-media">
          <MediaTile
            imageUrl={hotel.imageUrl}
            label={hotel.name}
            variant="hotel"
          />
          {hotel.logoUrl ? (
            <HotelLogo
              logoUrl={hotel.logoUrl}
              hotelName={hotel.name}
              placement="detail"
            />
          ) : null}
        </div>
        <div className="detail-heading">
          <Link className="back-link" href="/hotels">
            بازگشت به هتل‌ها ←
          </Link>
          <h1>{hotel.name}</h1>
          <p
            className={`detail-location${
              hotel.address ? " detail-location-with-address" : ""
            }`}
            tabIndex={hotel.address ? 0 : undefined}
            aria-label={
              hotel.address ? `${hotel.city}، ${hotel.address}` : hotel.city
            }
          >
            <SiteIcon name="location" />
            {hotel.city}
            {hotel.address ? (
              <span className="hotel-address-tooltip" role="tooltip">
                {hotel.address}
              </span>
            ) : null}
          </p>
          <div className="hotel-quality-summary">
            <HotelStars value={hotel.starRating} />
            {hotel.ratingSummary.reviewCount > 0 &&
            hotel.ratingSummary.averageRating !== null ? (
              <div
                className="hotel-review-score"
                aria-label={`امتیاز کاربران ${formatPersianRating(hotel.ratingSummary.averageRating)} از ۵، ${hotel.ratingSummary.reviewCount} نظر`}
              >
                <div>
                  <strong>
                    {formatPersianRating(hotel.ratingSummary.averageRating)}
                  </strong>{" "}
                  <span>از ۵</span>
                </div>
                <small>
                  {hotel.ratingSummary.reviewCount.toLocaleString("fa-IR")} نظر
                </small>
              </div>
            ) : null}
          </div>
          <p>
            {hotel.description ??
              "اطلاعات این هتل در فهرست عمومی هتل‌یاب ثبت شده است."}
          </p>
          <div className="detail-actions hotel-detail-actions">
            <EntityLibraryActions
              entity="hotel"
              slug={hotel.slug}
              label={hotel.name}
              variant="detail"
            />
            {hotel.websiteUrl ? (
              <a
                className="button"
                href={hotel.websiteUrl}
                target="_blank"
                rel="noreferrer"
              >
                صفحه رسمی هتل
              </a>
            ) : null}
            <span>
              {hotel.associations.length.toLocaleString("fa-IR")} چهره مرتبط
            </span>
          </div>
        </div>
      </section>

      {hotel.videos.length > 0 ? (
        <section className="section section-tint">
          <div className="container">
            <div className="results-header">
              <div>
                <span className="section-eyebrow">معرفی ویدیویی</span>
                <h2>ویدیوهای {hotel.name}</h2>
              </div>
              <span>{hotel.videos.length.toLocaleString("fa-IR")} ویدیو</span>
            </div>
            <ProgressiveVideoList className="hotel-video-list" key={hotel.slug}>
              {hotel.videos.map((video) => {
                const normalizedHandle = normalizeInstagramHandle(
                  video.instagramUsername,
                );
                return (
                  <div className="hotel-video-item" key={video.id}>
                    <TravelVideoPersonCard
                      instagramUsername={video.instagramUsername}
                      person={
                        peopleByInstagramHandle.get(normalizedHandle) ?? null
                      }
                    />
                    <TravelVideoCard
                      videoId={video.id}
                      title={video.title}
                      mediaUrl={video.mediaUrl}
                      thumbnailUrl={video.thumbnailUrl}
                      sourceUrl={video.sourceUrl}
                      instagramUsername={video.instagramUsername}
                    />
                  </div>
                );
              })}
            </ProgressiveVideoList>
          </div>
        </section>
      ) : null}

      {guestAssociations.length > 0 ? (
        <section className="section container hotel-guests-section">
          <div className="results-header">
            <div>
              <span className="section-eyebrow">مهمان‌های شناخته‌شده</span>
              <h2>چهره‌هایی که به این هتل رفته‌اند</h2>
            </div>
            <span>{guestAssociations.length.toLocaleString("fa-IR")} چهره</span>
          </div>
          <div className="hotel-guest-grid">
            {guestAssociations.map((association) => {
              const displayedOccupation = compactPersonOccupation(
                association.notablePerson.occupation,
                categoryLabel(association.notablePerson.primaryCategory),
              );
              return (
                <article className="hotel-guest-card" key={association.id}>
                  <Link
                    href={`/notable-people/${association.notablePerson.slug}`}
                  >
                    <div className="hotel-guest-avatar">
                      <MediaTile
                        imageUrl={association.notablePerson.imageUrl}
                        label={association.notablePerson.displayName}
                        variant="person"
                      />
                    </div>
                    <div>
                      <h3>
                        <PersonDisplayName
                          name={association.notablePerson.displayName}
                        />
                      </h3>
                      <div className="hotel-guest-meta">
                        {displayedOccupation ? (
                          <span>{displayedOccupation}</span>
                        ) : null}
                        {formatFollowerCount(
                          association.notablePerson.followerCount,
                        ) ? (
                          <span>
                            <bdi dir="ltr">
                              {formatFollowerCount(
                                association.notablePerson.followerCount,
                              )}
                            </bdi>{" "}
                            دنبال‌کننده
                          </span>
                        ) : null}
                      </div>
                      {association.notablePerson.instagramHandle ? (
                        <PersonInstagramHandle
                          handle={association.notablePerson.instagramHandle}
                        />
                      ) : null}
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <div id="hotel-reviews">
        <HotelReviews
          key={hotel.slug}
          hotelSlug={hotel.slug}
          hotelName={hotel.name}
        />
      </div>
    </main>
  );
}

function normalizeInstagramHandle(value: string | null): string {
  return (value ?? "").trim().replace(/^@/, "").toLocaleLowerCase("en-US");
}
