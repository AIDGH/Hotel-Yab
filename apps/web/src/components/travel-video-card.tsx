"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { SiteIcon } from "./site-icon";
import { VideoComments } from "./video-comments";

const TRAVEL_VIDEO_PLAY_EVENT = "hotel-yab:travel-video-play";

type TravelVideoCardProps = {
  videoId: string;
  title: string;
  mediaUrl: string;
  thumbnailUrl: string;
  sourceUrl: string;
  instagramUsername: string;
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
}: TravelVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackId = useId();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPausedThumbnail, setShowPausedThumbnail] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const progressPercent = duration > 0
    ? Math.min((currentTime / duration) * 100, 100)
    : 0;

  async function togglePlay() {
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

  function handleMediaClick(event: MouseEvent<HTMLDivElement>) {
    if (event.detail > 1) return;

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      void togglePlay();
      clickTimerRef.current = null;
    }, 220);
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

  async function navigateFullscreen(
    direction: -1 | 1,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();
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

    videoRef.current?.pause();
    try {
      await nextMedia.requestFullscreen();
      await nextVideo?.play();
    } catch (error) {
      console.error("Fullscreen navigation failed:", error);
    }
  }

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
      setIsFullscreen(document.fullscreenElement === mediaRef.current);
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  return (
    <article className="travel-video-card">
      <div
        ref={mediaRef}
        className="travel-video-media"
        onClick={handleMediaClick}
        onDoubleClick={handleMediaDoubleClick}
      >
        <video
          ref={videoRef}
          className="travel-video-player"
          playsInline
          preload="metadata"
          poster={thumbnailUrl}
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
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={syncVideoDuration}
          onDurationChange={syncVideoDuration}
          onTimeUpdate={() => {
            setCurrentTime(videoRef.current?.currentTime ?? 0);
          }}
        >
          <source
            src={mediaUrl}
            type="video/mp4"
          />
        </video>

        {showPausedThumbnail ? (
          <Image
            className="travel-video-paused-thumbnail"
            src={thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 340px"
            unoptimized
            aria-hidden="true"
          />
        ) : null}

        {!isPlaying && (
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

        <button
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
        </button>

        <button
          className="travel-video-speed"
          type="button"
          onClick={togglePlaybackRate}
          aria-label={`سرعت پخش: ${playbackRate === 1 ? "یک" : "دو"} برابر`}
          aria-pressed={playbackRate === 2}
        >
          {playbackRate}×
        </button>

        <button
          className="travel-video-fullscreen"
          type="button"
          onClick={(event) => void toggleFullscreen(event)}
          aria-label={isFullscreen ? "خروج از نمایش تمام‌صفحه" : "نمایش تمام‌صفحه"}
          aria-pressed={isFullscreen}
        >
          <SiteIcon name={isFullscreen ? "fullscreen-exit" : "fullscreen"} />
        </button>

        <div className="travel-video-fullscreen-navigation">
          <button
            type="button"
            className="travel-video-fullscreen-previous"
            aria-label="ویدیوی قبلی"
            onClick={(event) => void navigateFullscreen(-1, event)}
          >
            <SiteIcon name="arrow-left" />
          </button>
          <button
            type="button"
            className="travel-video-fullscreen-next"
            aria-label="ویدیوی بعدی"
            onClick={(event) => void navigateFullscreen(1, event)}
          >
            <SiteIcon name="arrow-left" />
          </button>
        </div>

        <div className="travel-video-overlay">
          <span>@{instagramUsername}</span>
          <strong>{title}</strong>
        </div>

        <div
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
        </div>
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
