import Link from "next/link";
import type { HotelListItem } from "@/lib/types";
import { HotelLogo } from "./hotel-logo";
import { MediaTile } from "./media-tile";

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
            <span>{hasVerifiedAssociations ? "✓" : "◇"}</span>
            {hasVerifiedAssociations
              ? "دارای ارتباط تأییدشده"
              : hasAssociations
                ? "روابط در حال تکمیل"
                : "هتل ثبت‌شده"}
          </span>
        </div>
        <div className="hotel-card-body">
          <div>
            <span className="location-label">⌖ {hotel.city}</span>
            <h3>{hotel.name}</h3>
          </div>
          <p>
            {hotel.description ??
              (hasAssociations
                ? "ارتباط‌های مستند این هتل با چهره‌های شناخته‌شده را ببینید."
                : "اطلاعات و ارتباط‌های این هتل در حال تکمیل است.")}
          </p>
          <div className="card-meta">
            <span>{hotel.associationCount.toLocaleString("fa-IR")} چهره مرتبط</span>
            <strong aria-hidden="true">←</strong>
          </div>
        </div>
      </Link>
    </article>
  );
}
