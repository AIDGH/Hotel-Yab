"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ResolvedTravelDestination,
  TravelVideo,
} from "@/lib/travel-videos";
import type { NotablePersonListItem } from "@/lib/types";
import { SiteIcon } from "./site-icon";
import { VideoComments } from "./video-comments";

const MOBILE_VIDEO_BATCH_SIZE = 12;

export type MobileExploreItem = {
  video: TravelVideo;
  destinations: ResolvedTravelDestination[];
  person: NotablePersonListItem | null;
};

export function MobileExploreReels({ items }: { items: MobileExploreItem[] }) {
  const [visibleCount, setVisibleCount] = useState(MOBILE_VIDEO_BATCH_SIZE);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const historyEntryRef = useRef(false);
  const visibleItems = items.slice(0, visibleCount);
  const remainingCount = Math.max(0, items.length - visibleItems.length);

  const dismissReels = useCallback(() => {
    setOpenIndex(null);
    historyEntryRef.current = false;
  }, []);

  const closeReels = useCallback(() => {
    if (historyEntryRef.current) {
      window.history.back();
      return;
    }
    dismissReels();
  }, [dismissReels]);

  function openReels(index: number) {
    setCurrentIndex(index);
    setOpenIndex(index);
    window.history.pushState(
      { hotelYabMobileReel: true },
      "",
      `#video-${visibleItems[index].video.videoId}`,
    );
    historyEntryRef.current = true;
  }

  useEffect(() => {
    function closeOnBrowserBack() {
      if (historyEntryRef.current) dismissReels();
    }

    window.addEventListener("popstate", closeOnBrowserBack);
    return () => window.removeEventListener("popstate", closeOnBrowserBack);
  }, [dismissReels]);

  useEffect(() => {
    if (openIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      const feed = feedRef.current;
      if (feed) feed.scrollTop = openIndex * feed.clientHeight;
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex]);

  return (
    <div className="mobile-explore">
      <div className="mobile-explore-grid" aria-live="polite">
        {visibleItems.map(({ video }, index) => (
          <button
            className="mobile-explore-tile"
            type="button"
            key={video.videoId}
            aria-label={`نمایش ویدیوی ${video.title}`}
            onClick={() => openReels(index)}
          >
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              sizes="33vw"
              unoptimized
            />
            <span className="mobile-explore-tile-icon">
              <SiteIcon name="video" />
            </span>
          </button>
        ))}
      </div>

      {remainingCount > 0 ? (
        <div className="mobile-explore-load-more">
          <button
            className="button pagination-secondary"
            type="button"
            onClick={() =>
              setVisibleCount((count) =>
                Math.min(count + MOBILE_VIDEO_BATCH_SIZE, items.length),
              )
            }
          >
            نمایش {Math.min(MOBILE_VIDEO_BATCH_SIZE, remainingCount).toLocaleString("fa-IR")} ویدیوی دیگر
          </button>
        </div>
      ) : null}

      {openIndex !== null ? (
        <section
          className="mobile-reels-modal"
          role="dialog"
          aria-modal="true"
          aria-label="نمایش ویدیوها"
        >
          <header className="mobile-reels-header">
            <button type="button" aria-label="بازگشت به اکسپلور" onClick={closeReels}>
              <SiteIcon name="arrow-left" />
            </button>
            <strong>ویدیوها</strong>
          </header>
          <div
            className="mobile-reels-feed"
            ref={feedRef}
            onScroll={(event) => {
              const feed = event.currentTarget;
              if (!feed.clientHeight) return;
              setCurrentIndex(
                Math.max(
                  0,
                  Math.min(
                    visibleItems.length - 1,
                    Math.round(feed.scrollTop / feed.clientHeight),
                  ),
                ),
              );
            }}
          >
            {visibleItems.map((item, index) => (
              <MobileReelSlide
                item={item}
                active={currentIndex === index}
                key={item.video.videoId}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MobileReelSlide({
  item,
  active,
}: {
  item: MobileExploreItem;
  active: boolean;
}) {
  const { video, person, destinations } = item;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const creatorName = person?.displayName ?? `@${video.instagramUsername}`;

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    if (!active) {
      player.pause();
      return;
    }
    player.muted = muted;
    void player.play().catch(() => setPlaying(false));
  }, [active, muted]);

  function togglePlay() {
    const player = videoRef.current;
    if (!player) return;
    if (player.paused) void player.play();
    else player.pause();
  }

  function toggleMute(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const player = videoRef.current;
    if (!player) return;
    const nextMuted = !muted;
    player.muted = nextMuted;
    setMuted(nextMuted);
  }

  return (
    <article className="mobile-reel-slide" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={video.mediaUrl}
        poster={video.thumbnailUrl}
        playsInline
        loop
        muted={muted}
        preload={active ? "auto" : "metadata"}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {!playing ? (
        <span className="mobile-reel-play-indicator" aria-hidden="true">
          <SiteIcon name="play" />
        </span>
      ) : null}

      <div className="mobile-reel-actions" onClick={(event) => event.stopPropagation()}>
        <button type="button" aria-label={muted ? "فعال کردن صدا" : "قطع صدا"} onClick={toggleMute}>
          <SiteIcon name={muted ? "volume-off" : "volume"} />
        </button>
        <VideoComments videoId={video.videoId} variant="sheet" />
        <a href={video.sourceUrl} target="_blank" rel="noreferrer" aria-label="مشاهده پست اصلی">
          <SiteIcon name="external-link" />
        </a>
      </div>

      <div className="mobile-reel-info" onClick={(event) => event.stopPropagation()}>
        <Link href={person ? `/notable-people/${person.slug}` : `/search?query=${encodeURIComponent(video.instagramUsername)}`}>
          <span className="mobile-reel-avatar">
            {person?.imageUrl ? (
              <Image src={person.imageUrl} alt="" fill sizes="42px" unoptimized />
            ) : (
              creatorName.slice(0, 1)
            )}
          </span>
          <strong>{creatorName}</strong>
          <span>@{video.instagramUsername}</span>
        </Link>
        <p>{video.title}</p>
        {destinations.length > 0 ? (
          <div className="mobile-reel-destinations">
            {destinations.map((destination) => (
              <Link href={destination.href} key={`${destination.routeType}-${destination.slug}`}>
                {destination.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
