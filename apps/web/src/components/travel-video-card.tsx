"use client";

import {
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { VideoComments } from "./video-comments";

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

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const progressPercent = duration > 0
    ? Math.min((currentTime / duration) * 100, 100)
    : 0;

  async function togglePlay() {
    const video = videoRef.current;

    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (error) {
      console.error("Video playback failed:", error);
    }
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
    const video = videoRef.current;

    if (!video) return;

    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setCurrentTime(video.currentTime);
  }, []);

  return (
    <article className="travel-video-card">
      <div
        className="travel-video-media"
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          className="travel-video-player"
          playsInline
          preload="metadata"
          poster={thumbnailUrl}
          onPlay={() => setIsPlaying(true)}
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
