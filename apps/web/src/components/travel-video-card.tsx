"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { SiteIcon } from "./site-icon";
import { VideoComments } from "./video-comments";

const TRAVEL_VIDEO_PLAY_EVENT = "hotel-yab:travel-video-play";
let suppressTravelVideoClickUntil = 0;
let fullscreenNavigationLocked = false;

type TravelVideoCardProps = {
  videoId: string;
  title: string;
  mediaUrl: string;
  thumbnailUrl: string;
  sourceUrl: string;
  instagramUsername: string;
  contentKind?: "VIDEO" | "POST" | "STORY";
  mediaItems?: Array<{
    displayOrder: number;
    mediaType: "IMAGE" | "VIDEO";
    mediaUrl: string;
    thumbnailUrl: string | null;
  }>;
};

function formatVideoTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "۰:۰۰";

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes.toLocaleString("fa-IR")}:${seconds
    .toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}`;
}

export function TravelVideoCard({
  videoId,
  title,
  mediaUrl,
  thumbnailUrl,
  sourceUrl,
  instagramUsername,
  contentKind = "VIDEO",
  mediaItems = [],
}: TravelVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const wasFullscreenRef = useRef(false);
  const continuePlaybackRef = useRef(false);
  const playbackId = useId();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPausedThumbnail, setShowPausedThumbnail] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const resolvedMediaItems = mediaItems.length > 0
    ? [...mediaItems].sort((left, right) => left.displayOrder - right.displayOrder)
    : [{ displayOrder: 1, mediaType: "VIDEO" as const, mediaUrl, thumbnailUrl }];
  const activeMedia = resolvedMediaItems[activeMediaIndex] ?? resolvedMediaItems[0];
  const isImage = activeMedia.mediaType === "IMAGE";

  const progressPercent = duration > 0
    ? Math.min((currentTime / duration) * 100, 100)
    : 0;

  async function togglePlay() {
    if (isImage) return;
    const video = videoRef.current;

    if (!video) return;

    try {
      if (video.paused) {
        setShowPausedThumbnail(false);
        await video.play();
      } else {
        video.pause();
      }
    } catch (error) {
      console.error("Video playback failed:", error);
    }
  }

  function navigateMedia(direction: -1 | 1, continuePlayback = false) {
    continuePlaybackRef.current = continuePlayback;
    setActiveMediaIndex((index) =>
      Math.max(0, Math.min(index + direction, resolvedMediaItems.length - 1)),
    );
    setIsPlaying(false);
    setShowPausedThumbnail(false);
    setCurrentTime(0);
    setDuration(0);
  }

  function handleMediaClick(event: MouseEvent<HTMLDivElement>) {
    if (event.detail > 1 || Date.now() < suppressTravelVideoClickUntil) return;

    if (resolvedMediaItems.length > 1) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const horizontalPosition = (event.clientX - bounds.left) / bounds.width;
      if (horizontalPosition <= 0.34) {
        navigateMedia(-1, isPlaying);
        return;
      }
      if (horizontalPosition >= 0.66) {
        navigateMedia(1, isPlaying);
        return;
      }
    }

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      void togglePlay();
      clickTimerRef.current = null;
    }, 220);
  }

  function handleMediaPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (resolvedMediaItems.length < 2) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input")) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handleMediaPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || resolvedMediaItems.length < 2) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    suppressTravelVideoClickUntil = Date.now() + 350;
    navigateMedia(deltaX < 0 ? 1 : -1, isPlaying);
  }

  async function toggleFullscreen(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await mediaRef.current?.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen failed:", error);
    }
  }

  const navigateFullscreen = useCallback(async (direction: -1 | 1) => {
    if (fullscreenNavigationLocked) return;
    const currentMedia = mediaRef.current;
    if (!currentMedia) return;

    const mediaItems = Array.from(
      document.querySelectorAll<HTMLElement>(".travel-video-media"),
    );
    const currentIndex = mediaItems.indexOf(currentMedia);
    if (currentIndex < 0 || mediaItems.length < 2) return;

    const nextIndex =
      (currentIndex + direction + mediaItems.length) % mediaItems.length;
    const nextMedia = mediaItems[nextIndex];
    const nextVideo = nextMedia.querySelector("video");

    fullscreenNavigationLocked = true;
    suppressTravelVideoClickUntil = Date.now() + 650;
    videoRef.current?.pause();
    try {
      await nextMedia.requestFullscreen();
      await nextVideo?.play();
    } catch (error) {
      console.error("Fullscreen navigation failed:", error);
    } finally {
      window.setTimeout(() => {
        fullscreenNavigationLocked = false;
      }, 420);
    }
  }, []);

  function handleMediaDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;
    void toggleFullscreen(event);
  }

  function toggleMute(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();

    const video = videoRef.current;

    if (!video) return;

    const nextMuted = !video.muted;

    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }

  function togglePlaybackRate(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();

    const video = videoRef.current;

    if (!video) return;

    const nextPlaybackRate = playbackRate === 1 ? 2 : 1;

    video.playbackRate = nextPlaybackRate;
    setPlaybackRate(nextPlaybackRate);
  }

  function syncVideoDuration() {
    const video = videoRef.current;

    if (!video) return;

    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setCurrentTime(video.currentTime);
  }

  function seekVideo(event: FormEvent<HTMLInputElement>) {
    event.stopPropagation();

    const video = videoRef.current;
    const nextTime = Number(event.currentTarget.value);

    if (!video || !Number.isFinite(nextTime)) return;

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  useEffect(() => {
    function handleOtherVideoPlay(event: Event) {
      const customEvent = event as CustomEvent<{
        playbackId: string;
      }>;

      if (customEvent.detail.playbackId === playbackId) {
        return;
      }

      const video = videoRef.current;

      if (video && !video.paused) {
        video.pause();
        setShowPausedThumbnail(true);
      }
    }

    window.addEventListener(
      TRAVEL_VIDEO_PLAY_EVENT,
      handleOtherVideoPlay,
    );

    return () => {
      window.removeEventListener(
        TRAVEL_VIDEO_PLAY_EVENT,
        handleOtherVideoPlay,
      );
    };
  }, [playbackId]);

  useEffect(() => {
    function syncFullscreenState() {
      const nextIsFullscreen = document.fullscreenElement === mediaRef.current;

      if (wasFullscreenRef.current && !nextIsFullscreen) {
        videoRef.current?.pause();
      }

      wasFullscreenRef.current = nextIsFullscreen;
      setIsFullscreen(nextIsFullscreen);
    }

    function navigateWithKeyboard(event: KeyboardEvent) {
      if (document.fullscreenElement !== mediaRef.current) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void navigateFullscreen(1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void navigateFullscreen(-1);
      }
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("keydown", navigateWithKeyboard);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("keydown", navigateWithKeyboard);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, [navigateFullscreen]);

  useEffect(() => {
    if (!continuePlaybackRef.current || isImage) return;
    continuePlaybackRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      void videoRef.current?.play().catch(() => setIsPlaying(false));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeMediaIndex, isImage]);

  return (
    <article className="travel-video-card">
      <div
        ref={mediaRef}
        className="travel-video-media"
        tabIndex={resolvedMediaItems.length > 1 ? 0 : undefined}
        onClick={handleMediaClick}
        onDoubleClick={handleMediaDoubleClick}
        onPointerDown={handleMediaPointerDown}
        onPointerUp={handleMediaPointerUp}
        onPointerCancel={() => {
          swipeStartRef.current = null;
        }}
        onKeyDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.matches("button, a, input")) return;
          if (resolvedMediaItems.length < 2) return;
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          navigateMedia(event.key === "ArrowLeft" ? -1 : 1, isPlaying);
        }}
      >
        {isImage ? (
          <Image
            className="travel-content-image"
            src={activeMedia.mediaUrl}
            alt={title}
            fill
            sizes="(max-width: 760px) 100vw, 420px"
            unoptimized
          />
        ) : (
          <video
            key={activeMedia.mediaUrl}
            ref={videoRef}
            className="travel-video-player"
            playsInline
            preload="metadata"
            poster={activeMedia.thumbnailUrl ?? thumbnailUrl}
            onPlay={() => {
              setIsPlaying(true);
              setShowPausedThumbnail(false);

              window.dispatchEvent(
                new CustomEvent(TRAVEL_VIDEO_PLAY_EVENT, {
                  detail: { playbackId },
                }),
              );
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              if (activeMediaIndex < resolvedMediaItems.length - 1) navigateMedia(1, true);
              else setIsPlaying(false);
            }}
            onLoadedMetadata={syncVideoDuration}
            onDurationChange={syncVideoDuration}
            onTimeUpdate={() => {
              setCurrentTime(videoRef.current?.currentTime ?? 0);
            }}
          >
            <source src={activeMedia.mediaUrl} type="video/mp4" />
          </video>
        )}

        {showPausedThumbnail ? (
          <Image
            className="travel-video-paused-thumbnail"
            src={activeMedia.thumbnailUrl ?? thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 340px"
            unoptimized
            aria-hidden="true"
          />
        ) : null}

        {!isImage && !isPlaying && (
          <button
            className="travel-video-play"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              togglePlay();
            }}
            aria-label="پخش ویدیو"
          >
            <span>▶</span>
          </button>
        )}

        {!isImage ? <button
          className="travel-video-mute"
          type="button"
          onClick={toggleMute}
          aria-label={
            isMuted
              ? "فعال کردن صدا"
              : "قطع صدا"
          }
        >
          <svg
            className="travel-video-volume-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />

            {!isMuted && (
              <>
                <path d="M15 9.5a4 4 0 0 1 0 5" />
                <path d="M17.5 7a7 7 0 0 1 0 10" />
              </>
            )}

            {isMuted && (
              <path d="M15 9 21 15M21 9l-6 6" />
            )}
          </svg>
        </button> : null}

        {!isImage ? <button
          className="travel-video-speed"
          type="button"
          onClick={togglePlaybackRate}
          aria-label={`سرعت پخش: ${playbackRate === 1 ? "یک" : "دو"} برابر`}
          aria-pressed={playbackRate === 2}
        >
          {playbackRate}×
        </button> : null}

        <button
          className="travel-video-fullscreen"
          type="button"
          onClick={(event) => void toggleFullscreen(event)}
          aria-label={isFullscreen ? "خروج از نمایش تمام‌صفحه" : "نمایش تمام‌صفحه"}
          aria-pressed={isFullscreen}
        >
          <SiteIcon name={isFullscreen ? "fullscreen-exit" : "fullscreen"} />
        </button>

        {resolvedMediaItems.length > 1 ? (
          <>
            <div className="travel-content-segments" aria-label={`${resolvedMediaItems.length} آیتم`}>
              {resolvedMediaItems.map((item, index) => (
                <span className={index === activeMediaIndex ? "is-active" : index < activeMediaIndex ? "is-viewed" : ""} key={`${item.displayOrder}-${item.mediaUrl}`} />
              ))}
            </div>
            <div className="travel-content-navigation">
              <button type="button" disabled={activeMediaIndex === 0} aria-label="آیتم قبلی" onClick={(event) => { event.stopPropagation(); navigateMedia(-1); }}><SiteIcon name="arrow-left" /></button>
              <button type="button" disabled={activeMediaIndex === resolvedMediaItems.length - 1} aria-label="آیتم بعدی" onClick={(event) => { event.stopPropagation(); navigateMedia(1); }}><SiteIcon name="arrow-left" /></button>
            </div>
          </>
        ) : null}

        <div className="travel-video-fullscreen-navigation">
          <button
            type="button"
            className="travel-video-fullscreen-previous"
            aria-label="ویدیوی قبلی"
            onClick={(event) => {
              event.stopPropagation();
              void navigateFullscreen(1);
            }}
          >
            <SiteIcon name="arrow-left" />
          </button>
          <button
            type="button"
            className="travel-video-fullscreen-next"
            aria-label="ویدیوی بعدی"
            onClick={(event) => {
              event.stopPropagation();
              void navigateFullscreen(-1);
            }}
          >
            <SiteIcon name="arrow-left" />
          </button>
        </div>

        <div className="travel-video-overlay">
          <span>@{instagramUsername} · {contentKind === "POST" ? "پست" : contentKind === "STORY" ? "استوری" : "ویدیو"}</span>
          <strong>{title}</strong>
        </div>

        {!isImage ? <div
          className="travel-video-progress"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <input
            className="travel-video-progress-input"
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onInput={seekVideo}
            disabled={duration <= 0}
            aria-label="زمان ویدیو"
            aria-valuetext={`${formatVideoTime(currentTime)} از ${formatVideoTime(duration)}`}
            style={{
              "--travel-video-progress": `${progressPercent}%`,
            } as CSSProperties}
          />
        </div> : null}
      </div>

      <a
        className="travel-video-source"
        href={sourceUrl}
        target="_blank"
        rel="noreferrer"
      >
        مشاهده پست اصلی در اینستاگرام
      </a>
      <VideoComments videoId={videoId} />
    </article>
  );
}
