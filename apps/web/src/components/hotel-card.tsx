import Link from "next/link";
import type { HotelListItem } from "@/lib/types";
import { MediaTile } from "./media-tile";

export function HotelCard({ hotel }: { hotel: HotelListItem }) {
  return (
    <article className="hotel-card">
      <Link href={`/hotels/${hotel.slug}`} aria-label={`مشاهده ${hotel.name}`}>
        <div className="hotel-card-media">
          <MediaTile imageUrl={hotel.imageUrl} label={hotel.name} variant="hotel" />
          <span className="verified-badge">
            <span>✓</span>
            اطلاعات تأییدشده
          </span>
        </div>
        <div className="hotel-card-body">
          <div>
            <span className="location-label">⌖ {hotel.city}</span>
            <h3>{hotel.name}</h3>
          </div>
          <p>
            {hotel.description ??
              "ارتباط‌های مستند این هتل با چهره‌های شناخته‌شده را ببینید."}
          </p>
          <div className="card-meta">
            <span>{hotel.associationCount.toLocaleString("fa-IR")} ارتباط مستند</span>
            <strong aria-hidden="true">←</strong>
          </div>
        </div>
      </Link>
    </article>
  );
}
