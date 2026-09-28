"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
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
import mediaGestures from "./media-gestures.module.css";

const MOBILE_VIDEO_BATCH_SIZE = 9;
const DESKTOP_VIDEO_BATCH_SIZE = 12;

export type MobileExploreItem = {
  video: TravelVideo;
  destinations: ResolvedTravelDestination[];
  person: NotablePersonListItem | null;
};

export function ExploreReels({
  items,
  variant,
}: {
  items: MobileExploreItem[];
  variant: "mobile" | "desktop";
}) {
  const batchSize =
    variant === "desktop"
      ? DESKTOP_VIDEO_BATCH_SIZE
      : MOBILE_VIDEO_BATCH_SIZE;
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fastForwarding, setFastForwarding] = useState(false);
  const [muted, setMuted] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const historyEntryRef = useRef(false);
  const visibleItems = items.slice(0, visibleCount);
  const remainingCount = Math.max(0, items.length - visibleItems.length);

  const dismissReels = useCallback(() => {
    setOpenIndex(null);
    setFastForwarding(false);
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
    setFastForwarding(false);
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

  useEffect(() => {
    if (openIndex === null || variant !== "desktop") return;

    function scrollToVideo(index: number) {
      const feed = feedRef.current;
      if (!feed) return;
      feed.scrollTo({ top: index * feed.clientHeight, behavior: "smooth" });
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeReels();
        return;
      }

      const direction =
        event.key === "ArrowDown"
          ? 1
          : event.key === "ArrowUp"
            ? -1
            : 0;
      if (direction === 0) return;

      event.preventDefault();
      const targetIndex = Math.max(
        0,
        Math.min(currentIndex + direction, items.length - 1),
      );
      if (targetIndex >= visibleCount) {
        setVisibleCount((count) =>
          Math.min(Math.max(count + batchSize, targetIndex + 1), items.length),
        );
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => scrollToVideo(targetIndex)),
        );
        return;
      }
      scrollToVideo(targetIndex);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    batchSize,
    closeReels,
    currentIndex,
    items.length,
    openIndex,
    variant,
    visibleCount,
  ]);

  return (
    <div className={variant === "desktop" ? "desktop-explore" : "mobile-explore"}>
      <div className="mobile-explore-grid" aria-live="polite">
        {visibleItems.map(({ video, destinations }, index) => (
          <button
            className="mobile-explore-tile"
            type="button"
            key={video.videoId}
            aria-label={`نمایش محتوای ${video.title}`}
            onClick={() => openReels(index)}
          >
            <Image
              src={video.mediaItems[0]?.thumbnailUrl ?? (video.mediaItems[0]?.mediaType === "IMAGE" ? video.mediaItems[0].mediaUrl : video.thumbnailUrl)}
              alt=""
              fill
              sizes={variant === "desktop" ? "25vw" : "33vw"}
              unoptimized
            />
            <span className="mobile-explore-tile-icon">
              <SiteIcon name={video.mediaItems[0]?.mediaType === "IMAGE" ? "image" : "video"} />
            </span>
            <span className="mobile-explore-tile-meta">
              <strong>{video.title}</strong>
              {destinations.length > 0 ? (
                <small>
                  <SiteIcon name="location" />
                  {destinations.map((destination) => destination.name).join("، ")}
                </small>
              ) : null}
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
                Math.min(count + batchSize, items.length),
              )
            }
          >
            نمایش {Math.min(batchSize, remainingCount).toLocaleString("fa-IR")} محتوای دیگر
          </button>
        </div>
      ) : null}

      {openIndex !== null ? (
        <section
          className={`mobile-reels-modal${fastForwarding ? " is-fast-forwarding" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="نمایش محتواها"
        >
          <header className="mobile-reels-header">
            <button type="button" aria-label="بازگشت به محتواها" onClick={closeReels}>
              <SiteIcon name="arrow-left" />
            </button>
            <strong>محتواها</strong>
          </header>
          <div
            className="mobile-reels-feed"
            ref={feedRef}
            onScroll={(event) => {
              const feed = event.currentTarget;
              if (!feed.clientHeight) return;
              const nextIndex = Math.max(
                0,
                Math.min(
                  visibleItems.length - 1,
                  Math.round(feed.scrollTop / feed.clientHeight),
                ),
              );
              if (nextIndex !== currentIndex) setFastForwarding(false);
              setCurrentIndex(nextIndex);

              if (
                nextIndex === visibleItems.length - 1 &&
                visibleCount < items.length
              ) {
                setVisibleCount((count) =>
                  Math.min(count + batchSize, items.length),
                );
              }
            }}
          >
            {visibleItems.map((item, index) => (
              <MobileReelSlide
                item={item}
                active={currentIndex === index}
                variant={variant}
                muted={muted}
                onMutedChange={setMuted}
                onFastForwardChange={setFastForwarding}
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
  variant,
  muted,
  onMutedChange,
  onFastForwardChange,
}: {
  item: MobileExploreItem;
  active: boolean;
  variant: "mobile" | "desktop";
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  onFastForwardChange: (fastForwarding: boolean) => void;
}) {
  const { video, person, destinations } = item;
  const videoRefsRef = useRef<Array<HTMLVideoElement | null>>([]);
  const speedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fastForwardRef = useRef(false);
  const holdingRef = useRef(false);
  const resumeAfterHoldRef = useRef(false);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeDirectionRef = useRef<-1 | 1 | null>(null);
  const imageElapsedRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [holding, setHolding] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const mediaItems = video.mediaItems.length > 0
    ? [...video.mediaItems].sort((left, right) => left.displayOrder - right.displayOrder)
    : [{ displayOrder: 1, mediaType: "VIDEO" as const, mediaUrl: video.mediaUrl, thumbnailUrl: video.thumbnailUrl }];
  const activeMedia = mediaItems[activeMediaIndex] ?? mediaItems[0];
  const isImage = activeMedia.mediaType === "IMAGE";
  const creatorName = person?.displayName ?? `@${video.instagramUsername}`;

  function currentPlayer() {
    return videoRefsRef.current[activeMediaIndex] ?? null;
  }

  useEffect(() => {
    videoRefsRef.current.forEach((player, index) => {
      if (player && (!active || index !== activeMediaIndex)) player.pause();
    });

    const player = videoRefsRef.current[activeMediaIndex];
    if (!player || isImage) return;
    if (!active) return;
    player.muted = muted;
    void player.play().catch(() => setPlaying(false));
  }, [active, activeMediaIndex, isImage, muted]);

  useEffect(() => {
    if (!active || !isImage || holding || dragging) return;

    let frame = 0;
    const startedAt = performance.now() - imageElapsedRef.current;
    function updateProgress(now: number) {
      const elapsed = Math.min(now - startedAt, 5000);
      imageElapsedRef.current = elapsed;
      setMediaProgress(elapsed / 5000);

      if (elapsed >= 5000) {
        if (activeMediaIndex < mediaItems.length - 1) {
          imageElapsedRef.current = 0;
          setMediaProgress(0);
          setActiveMediaIndex((index) => index + 1);
          setPlaying(false);
        }
        return;
      }
      frame = window.requestAnimationFrame(updateProgress);
    }

    frame = window.requestAnimationFrame(updateProgress);
    return () => window.cancelAnimationFrame(frame);
  }, [active, activeMediaIndex, dragging, holding, isImage, mediaItems.length]);

  function togglePlay() {
    if (isImage) return;
    const player = currentPlayer();
    if (!player) return;
    if (player.paused) void player.play();
    else player.pause();
  }

  function navigateMedia(direction: -1 | 1) {
    imageElapsedRef.current = 0;
    setMediaProgress(0);
    setActiveMediaIndex((index) =>
      Math.max(0, Math.min(index + direction, mediaItems.length - 1)),
    );
    setPlaying(false);
    setDragOffset(0);
  }

  function toggleMute(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const player = currentPlayer();
    if (!player || isImage) return;
    const nextMuted = !muted;
    player.muted = nextMuted;
    onMutedChange(nextMuted);
  }

  function startPress(
    event: PointerEvent<HTMLButtonElement>,
    mode: "speed" | "pause",
  ) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pressStartRef.current = { x: event.clientX, y: event.clientY };
    swipeDirectionRef.current = null;
    setDragging(false);
    setDragOffset(0);
    if (speedTimerRef.current) clearTimeout(speedTimerRef.current);

    speedTimerRef.current = setTimeout(() => {
      if (mode === "pause") {
        const player = currentPlayer();
        resumeAfterHoldRef.current = Boolean(player && !player.paused);
        player?.pause();
        holdingRef.current = true;
        setHolding(true);
        onFastForwardChange(true);
        return;
      }

      const player = currentPlayer();
      if (!player || isImage) return;
      fastForwardRef.current = true;
      player.playbackRate = 2;
      onFastForwardChange(true);
      if (player.paused) void player.play();
    }, 180);
  }

  function movePress(event: PointerEvent<HTMLButtonElement>) {
    const start = pressStartRef.current;
    if (!start || fastForwardRef.current) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) < 6) return;

    event.preventDefault();
    if (speedTimerRef.current) clearTimeout(speedTimerRef.current);
    speedTimerRef.current = null;
    if (mediaItems.length < 2) return;
    const frameWidth = event.currentTarget.parentElement?.clientWidth || window.innerWidth;
    const atStart = activeMediaIndex === 0 && deltaX > 0;
    const atEnd = activeMediaIndex === mediaItems.length - 1 && deltaX < 0;
    const resistedOffset = atStart || atEnd ? deltaX * 0.22 : deltaX;
    setDragging(true);
    setDragOffset(Math.max(-frameWidth, Math.min(resistedOffset, frameWidth)));
    swipeDirectionRef.current = Math.abs(deltaX) >= 44
      ? deltaX < 0 ? 1 : -1
      : null;
  }

  function finishPress(
    event: PointerEvent<HTMLButtonElement>,
    direction: -1 | 0 | 1,
  ) {
    event.stopPropagation();
    if (speedTimerRef.current) clearTimeout(speedTimerRef.current);
    speedTimerRef.current = null;
    const player = currentPlayer();
    if (player) player.playbackRate = 1;

    const swipeDirection = swipeDirectionRef.current;
    pressStartRef.current = null;
    swipeDirectionRef.current = null;
    setDragging(false);
    setDragOffset(0);

    if (fastForwardRef.current) {
      fastForwardRef.current = false;
      onFastForwardChange(false);
    } else if (swipeDirection !== null && mediaItems.length > 1) {
      holdingRef.current = false;
      setHolding(false);
      onFastForwardChange(false);
      navigateMedia(swipeDirection);
    } else if (holdingRef.current) {
      holdingRef.current = false;
      setHolding(false);
      onFastForwardChange(false);
      if (resumeAfterHoldRef.current && player) void player.play();
      resumeAfterHoldRef.current = false;
    } else if (direction !== 0 && mediaItems.length > 1) {
      navigateMedia(direction);
    } else {
      togglePlay();
    }
  }

  function cancelPress(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (speedTimerRef.current) clearTimeout(speedTimerRef.current);
    speedTimerRef.current = null;
    const player = currentPlayer();
    if (player) player.playbackRate = 1;
    pressStartRef.current = null;
    swipeDirectionRef.current = null;
    setDragging(false);
    setDragOffset(0);
    fastForwardRef.current = false;
    holdingRef.current = false;
    setHolding(false);
    if (resumeAfterHoldRef.current && player) void player.play();
    resumeAfterHoldRef.current = false;
    onFastForwardChange(false);
  }

  useEffect(() => {
    if (!active || variant !== "desktop" || mediaItems.length < 2) return;

    function navigateWithKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      imageElapsedRef.current = 0;
      setMediaProgress(0);
      setActiveMediaIndex((index) =>
        Math.max(0, Math.min(index + direction, mediaItems.length - 1)),
      );
      setPlaying(false);
    }

    document.addEventListener("keydown", navigateWithKeyboard);
    return () => document.removeEventListener("keydown", navigateWithKeyboard);
  }, [active, mediaItems.length, variant]);

  useEffect(() => () => {
    if (speedTimerRef.current) clearTimeout(speedTimerRef.current);
  }, []);

  return (
    <article
      className={`mobile-reel-slide ${mediaGestures.surface}${isImage ? " is-image" : ""}`}
      onClick={togglePlay}
      onContextMenu={(event) => {
        if (!(event.target instanceof Element) || !event.target.closest('input, textarea, [contenteditable="true"]')) event.preventDefault();
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      <div
        className={`mobile-reel-media-track${dragging ? " is-dragging" : ""}`}
        style={{
          transform: `translate3d(calc(${-activeMediaIndex * 100}% + ${dragOffset}px), 0, 0)`,
        }}
      >
        {mediaItems.map((media, index) => (
          <div className="mobile-reel-media-panel" key={`${media.displayOrder}-${media.mediaUrl}`}>
            {media.mediaType === "IMAGE" ? (
              <Image
                className="mobile-reel-image"
                src={media.mediaUrl}
                alt={video.title}
                fill
                sizes="100vw"
                unoptimized
                priority={active && index === activeMediaIndex}
              />
            ) : (
              <video
                ref={(element) => {
                  videoRefsRef.current[index] = element;
                }}
                src={media.mediaUrl}
                poster={media.thumbnailUrl ?? video.thumbnailUrl}
                playsInline
                loop={mediaItems.length === 1}
                muted={muted}
                preload={active && index === activeMediaIndex ? "auto" : "metadata"}
                onPlay={() => {
                  if (index === activeMediaIndex) setPlaying(true);
                }}
                onPause={() => {
                  if (index === activeMediaIndex) setPlaying(false);
                }}
                onLoadedMetadata={(event) => {
                  if (index !== activeMediaIndex) return;
                  const player = event.currentTarget;
                  setMediaProgress(player.duration > 0 ? player.currentTime / player.duration : 0);
                }}
                onTimeUpdate={(event) => {
                  if (index !== activeMediaIndex) return;
                  const player = event.currentTarget;
                  setMediaProgress(player.duration > 0 ? player.currentTime / player.duration : 0);
                }}
                onEnded={() => {
                  if (index === activeMediaIndex && activeMediaIndex < mediaItems.length - 1) navigateMedia(1);
                }}
              />
            )}
          </div>
        ))}
      </div>

      {!isImage && !playing ? (
        <span className="mobile-reel-play-indicator" aria-hidden="true">
          <SiteIcon name="play" />
        </span>
      ) : null}

      <div className="mobile-reel-hold-zones">
        <button
          type="button"
          aria-label={mediaItems.length > 1 ? "آیتم قبلی؛ برای پخش دو برابر نگه دارید" : "برای پخش دو برابر نگه دارید"}
          onPointerDown={(event) => startPress(event, "speed")}
          onPointerMove={movePress}
          onPointerUp={(event) => finishPress(event, -1)}
          onPointerCancel={cancelPress}
          onClick={(event) => event.stopPropagation()}
        />
        <button
          type="button"
          aria-label="برای توقف موقت نگه دارید"
          onPointerDown={(event) => startPress(event, "pause")}
          onPointerMove={movePress}
          onPointerUp={(event) => finishPress(event, 0)}
          onPointerCancel={cancelPress}
          onClick={(event) => event.stopPropagation()}
        />
        <button
          type="button"
          aria-label={mediaItems.length > 1 ? "آیتم بعدی؛ برای پخش دو برابر نگه دارید" : "برای پخش دو برابر نگه دارید"}
          onPointerDown={(event) => startPress(event, "speed")}
          onPointerMove={movePress}
          onPointerUp={(event) => finishPress(event, 1)}
          onPointerCancel={cancelPress}
          onClick={(event) => event.stopPropagation()}
        />
      </div>

      {variant === "desktop" && mediaItems.length > 1 ? (
        <div className="mobile-reel-image-navigation">
          <button type="button" disabled={activeMediaIndex === 0} aria-label="آیتم قبلی" onClick={(event) => { event.stopPropagation(); navigateMedia(-1); }}><SiteIcon name="arrow-left" /></button>
          <button type="button" disabled={activeMediaIndex === mediaItems.length - 1} aria-label="آیتم بعدی" onClick={(event) => { event.stopPropagation(); navigateMedia(1); }}><SiteIcon name="arrow-left" /></button>
        </div>
      ) : null}

      {mediaItems.length > 1 ? (
        <div className="mobile-reel-segments" aria-label={`${mediaItems.length} آیتم`}>
          {mediaItems.map((media, index) => (
            <span
              className={index === activeMediaIndex ? "is-active" : index < activeMediaIndex ? "is-viewed" : ""}
              key={`${media.displayOrder}-${media.mediaUrl}`}
              style={{ "--media-progress": `${index === activeMediaIndex ? mediaProgress * 100 : 0}%` } as CSSProperties}
            />
          ))}
        </div>
      ) : null}

      <div className="mobile-reel-actions" onClick={(event) => event.stopPropagation()}>
        {!isImage ? <button type="button" aria-label={muted ? "فعال کردن صدا" : "قطع صدا"} onClick={toggleMute}>
          <SiteIcon name={muted ? "volume-off" : "volume"} />
        </button> : null}
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
