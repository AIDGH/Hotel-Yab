"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { browserApi } from "@/lib/browser-api";
import { useAuth } from "./auth-provider";

type VideoComment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  status?: string;
  replies: VideoComment[];
};

export function VideoComments({ videoId }: { videoId: string }) {
  const { user, openAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function toggleComments() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !loaded) {
      try {
        const result = await browserApi<{ data: VideoComment[] }>(
          `/videos/${encodeURIComponent(videoId)}/comments`,
        );
        setComments(result.data);
      } catch {
        setMessage("دیدگاه‌ها فعلاً در دسترس نیستند.");
      } finally {
        setLoaded(true);
      }
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      openAuth();
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const result = await browserApi<{ data: VideoComment }>(
        `/videos/${encodeURIComponent(videoId)}/comments`,
        { method: "POST", body: JSON.stringify({ body }) },
      );
      setComments((items) => [...items, result.data]);
      setBody("");
      setMessage("دیدگاه شما ثبت شد و پس از بررسی منتشر می‌شود.");
    } catch {
      setMessage("ثبت دیدگاه انجام نشد؛ ابتدا پروفایل را کامل کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`video-comments${open ? " video-comments-open" : ""}`}>
      <button
        className="video-comments-toggle"
        type="button"
        onClick={() => void toggleComments()}
        aria-expanded={open}
      >
        <span>دیدگاه‌های ویدیو</span>
        <small>{open ? "بستن ↑" : "نمایش ↓"}</small>
      </button>

      {open ? (
        <div className="video-comments-panel">
          <form className="video-comment-form" onSubmit={submit}>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              minLength={2}
              maxLength={1000}
              placeholder={user ? "دیدگاه شما درباره این ویدیو…" : "برای نوشتن دیدگاه وارد شوید"}
              disabled={!user}
              required
            />
            {user ? (
              <button className="button button-small" type="submit" disabled={submitting}>
                {submitting ? "در حال ثبت…" : "ثبت دیدگاه"}
              </button>
            ) : (
              <button className="button button-small" type="button" onClick={openAuth}>ورود و نوشتن دیدگاه</button>
            )}
          </form>
          {message ? <p className="video-comment-message" role="status">{message}</p> : null}
          <div className="video-comment-list">
            {comments.length ? comments.map((comment) => (
              <article className="video-comment" key={comment.id}>
                <div><strong>{comment.authorName}</strong>{comment.status === "PENDING" ? <small>در انتظار بررسی</small> : null}</div>
                <p>{comment.body}</p>
                {comment.replies?.map((reply) => (
                  <div className="video-comment-reply" key={reply.id}>
                    <strong>{reply.authorName}</strong>
                    <p>{reply.body}</p>
                  </div>
                ))}
              </article>
            )) : loaded ? <p className="video-comments-empty">هنوز دیدگاهی منتشر نشده است.</p> : <p>در حال دریافت دیدگاه‌ها…</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
