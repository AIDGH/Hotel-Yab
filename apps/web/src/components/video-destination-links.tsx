import Link from "next/link";

import type { ResolvedTravelDestination } from "@/lib/travel-videos";

export function VideoDestinationLinks({
  destinations,
}: {
  destinations: ResolvedTravelDestination[];
}) {
  return (
    <aside className="video-destination-card">
      <span>مقصدهای این ویدیو</span>
      {destinations.length > 0 ? (
        <div className="video-destination-links">
          {destinations.map((destination) => (
            <Link
              href={destination.href}
              key={`${destination.routeType}-${destination.slug}`}
            >
              <small>
                {destination.destinationType === "CITY" ? "شهر" : "استان"}
              </small>
              {destination.name}
            </Link>
          ))}
        </div>
      ) : (
        <p>مقصدهای این ویدیو هنوز در داده مقصدها ثبت نشده‌اند.</p>
      )}
    </aside>
  );
}
