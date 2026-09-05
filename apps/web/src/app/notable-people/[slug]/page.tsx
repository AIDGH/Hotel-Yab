import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { EntityLibraryActions } from "@/components/entity-library-actions";
import { MediaTile } from "@/components/media-tile";
import { PersonDisplayName } from "@/components/person-display-name";
import { compactPersonOccupation } from "@/components/person-occupation";
import { PersonProfileMeta } from "@/components/person-profile-meta";
import { ProgressiveVideoList } from "@/components/progressive-video-list";
import { SourceList } from "@/components/source-list";
import { TravelVideoCard } from "@/components/travel-video-card";
import { VideoDestinationLinks } from "@/components/video-destination-links";
import { SiteIcon } from "@/components/site-icon";
import { getNotablePerson } from "@/lib/api";
import {
  associationLabel,
  categoryLabel,
  formatDate,
} from "@/lib/labels";

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
  const visibleBiography = person.biography?.includes("در حال تکمیل")
    ? null
    : person.biography;
  const displayedOccupation = compactPersonOccupation(
    person.occupation,
    categoryLabel(person.primaryCategory),
  );
  const hotelVideosByHotelId = new Map<string, typeof person.videos>();
  for (const video of person.videos) {
    if (video.videoCategory !== "HOTEL") continue;
    for (const hotel of video.hotels) {
      const currentVideos = hotelVideosByHotelId.get(hotel.id) ?? [];
      currentVideos.push(video);
      hotelVideosByHotelId.set(hotel.id, currentVideos);
    }
  }
  const travelVideos = person.videos.filter(
    (video) => video.videoCategory === "TRAVEL",
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
          {displayedOccupation ? (
            <span className="section-eyebrow">{displayedOccupation}</span>
          ) : null}
          <h1>
            <PersonDisplayName name={person.displayName} />
          </h1>
          <PersonProfileMeta
            className="detail-location"
            instagramHandle={person.instagramHandle}
            occupation={person.occupation}
            followerCount={person.followerCount}
            primaryCategory={person.primaryCategory}
            showOccupation={false}
          />
          <p>
            {visibleBiography ??
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
        <div className="container detail-content detail-content-single">
          <div className="detail-main">
            <span className="section-eyebrow">هتل‌های مرتبط</span>
            <h2>ارتباط‌های این چهره</h2>
            <div className="association-list">
              {person.associations.map((association) => {
                const hotelVideos =
                  hotelVideosByHotelId.get(association.hotel.id) ?? [];
                const visibleSummary = association.summary.includes("تکمیل")
                  ? null
                  : association.summary;
                return (
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
                      <small><SiteIcon name="location" /> {association.hotel.city}</small>
                      {visibleSummary &&
                      (hotelVideos.length > 0 || association.sources.length > 0) ? (
                        <p>{visibleSummary}</p>
                      ) : null}
                    </div>
                  </div>
                  {association.verificationStatus === "VERIFIED" ? (
                    <div className="verification-row">
                      <span>
                        <SiteIcon name="check" />
                        تأییدشده
                      </span>
                      {association.verifiedAt ? (
                        <small>بررسی در {formatDate(association.verifiedAt)}</small>
                      ) : null}
                    </div>
                  ) : null}
                  {hotelVideos.length > 0 ? (
                    <ProgressiveVideoList
                      className="association-hotel-videos"
                      key={`hotel-videos-${association.hotel.id}`}
                    >
                      {hotelVideos.map((video) => (
                        <TravelVideoCard
                          key={video.id}
                          videoId={video.id}
                          title={video.title}
                          mediaUrl={video.mediaUrl}
                          thumbnailUrl={video.thumbnailUrl}
                          sourceUrl={video.sourceUrl}
                          instagramUsername={video.instagramUsername}
                          contentKind={video.contentKind}
                          mediaItems={video.mediaItems}
                        />
                      ))}
                    </ProgressiveVideoList>
                  ) : null}
                  {association.sources.length > 0 ? (
                    <SourceList sources={association.sources} />
                  ) : null}
                </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {travelVideos.length > 0 ? (
      <section className="section container person-video-section">
        <div className="results-header">
          <div>
            <span className="section-eyebrow">محتواهای این چهره</span>
            <h2>سفرها و مقصدها</h2>
          </div>
          <span>{travelVideos.length.toLocaleString("fa-IR")} محتوا</span>
        </div>

        <ProgressiveVideoList
            className="person-video-list"
            key={`travel-videos-${person.slug}`}
          >
            {travelVideos.map((video) => (
              <div className="person-video-item" key={video.id}>
                <TravelVideoCard
                  videoId={video.id}
                  title={video.title}
                  mediaUrl={video.mediaUrl}
                  thumbnailUrl={video.thumbnailUrl}
                  sourceUrl={video.sourceUrl}
                  instagramUsername={video.instagramUsername}
                  contentKind={video.contentKind}
                  mediaItems={video.mediaItems}
                />
                <VideoDestinationLinks
                  destinations={video.destinations.map((destination) => {
                    const routeType = destination.type === "CITY" ? "cities" : "provinces";
                    return {
                      destinationType: destination.type,
                      routeType,
                      slug: destination.slug,
                      name: destination.name,
                      href: `/destinations/${routeType}/${destination.slug}`,
                    };
                  })}
                />
              </div>
            ))}
        </ProgressiveVideoList>
      </section>
      ) : null}
    </main>
  );
}
