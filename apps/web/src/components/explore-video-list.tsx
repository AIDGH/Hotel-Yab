"use client";

import { useState } from "react";

import type {
  ResolvedTravelDestination,
  TravelVideo,
} from "@/lib/travel-videos";
import type { NotablePersonListItem } from "@/lib/types";
import { TravelVideoCard } from "./travel-video-card";
import { TravelVideoPersonCard } from "./travel-video-person-card";
import { VideoDestinationLinks } from "./video-destination-links";

const VIDEO_BATCH_SIZE = 6;

type ExploreVideoItem = {
  video: TravelVideo;
  destinations: ResolvedTravelDestination[];
  person: NotablePersonListItem | null;
};

export function ExploreVideoList({ items }: { items: ExploreVideoItem[] }) {
  const [visibleCount, setVisibleCount] = useState(VIDEO_BATCH_SIZE);
  const visibleItems = items.slice(0, visibleCount);
  const remainingCount = Math.max(0, items.length - visibleItems.length);

  return (
    <>
      <div
        className="explore-video-list"
        id="explore-video-list"
        aria-live="polite"
      >
        {visibleItems.map(({ video, destinations, person }) => (
          <div className="explore-video-item" key={video.videoId}>
            <TravelVideoPersonCard
              instagramUsername={video.instagramUsername}
              person={person}
            />
            <TravelVideoCard
              videoId={video.videoId}
              title={video.title}
              mediaUrl={video.mediaUrl}
              thumbnailUrl={video.thumbnailUrl}
              sourceUrl={video.sourceUrl}
              instagramUsername={video.instagramUsername}
            />
            <VideoDestinationLinks destinations={destinations} />
          </div>
        ))}
        {remainingCount > 0 ? (
          <div className="explore-load-more">
            <button
              className="button pagination-secondary"
              type="button"
              aria-controls="explore-video-list"
              onClick={() =>
                setVisibleCount((currentCount) =>
                  Math.min(currentCount + VIDEO_BATCH_SIZE, items.length),
                )
              }
            >
              نمایش {Math.min(VIDEO_BATCH_SIZE, remainingCount).toLocaleString("fa-IR")} ویدیوی دیگر
            </button>
            <span>
              {visibleItems.length.toLocaleString("fa-IR")} از {items.length.toLocaleString("fa-IR")}
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}
