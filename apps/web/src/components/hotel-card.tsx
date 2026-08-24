import Link from "next/link";
import type { HotelListItem } from "@/lib/types";
import { HotelLogo } from "./hotel-logo";
import { HotelStars } from "./hotel-stars";
import { MediaTile } from "./media-tile";
import { EntityLibraryActions } from "./entity-library-actions";
import { SiteIcon } from "./site-icon";

export function HotelCard({ hotel }: { hotel: HotelListItem }) {
  const hasAssociations = hotel.associationCount > 0;
  const hasVerifiedAssociations = hotel.verifiedAssociationCount > 0;

  return (
    <article className="hotel-card">
      <Link href={`/hotels/${hotel.slug}`} aria-label={`مشاهده ${hotel.name}`}>
        <div className="hotel-card-media">
          <MediaTile imageUrl={hotel.imageUrl} label={hotel.name} variant="hotel" />
          {hotel.logoUrl ? (
            <HotelLogo
              logoUrl={hotel.logoUrl}
              hotelName={hotel.name}
              placement="card"
            />
          ) : null}
          <span
            className={`status-badge${
              hasVerifiedAssociations ? "" : " status-badge-neutral"
            }`}
          >
            <SiteIcon name={hasVerifiedAssociations ? "check" : "hotel"} />
            {hasVerifiedAssociations
              ? "دارای ارتباط تأییدشده"
              : hasAssociations
                ? "دارای چهره مرتبط"
                : "هتل ثبت‌شده"}
          </span>
        </div>
        <div className="hotel-card-body">
          <div>
            <span className="location-label"><SiteIcon name="location" /> {hotel.city}</span>
            <h3>{hotel.name}</h3>
            <HotelStars value={hotel.starRating} />
          </div>
          <p>
            {hotel.description ??
              (hasAssociations
                ? "ارتباط‌های مستند این هتل با چهره‌های شناخته‌شده را ببینید."
                : "اطلاعات این هتل را ببینید.")}
          </p>
          <div className="card-meta">
            <span>{hotel.associationCount.toLocaleString("fa-IR")} چهره مرتبط</span>
            <SiteIcon name="arrow-left" />
          </div>
        </div>
      </Link>
      <EntityLibraryActions entity="hotel" slug={hotel.slug} label={hotel.name} />
    </article>
  );
}
