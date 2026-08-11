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

type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "HATEFUL"
  | "MISINFORMATION"
  | "OTHER";

export function VideoComments({ videoId }: { videoId: string }) {
  const { user, openAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
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
        setFeedback({
          tone: "error",
          text: "دیدگاه‌ها فعلاً در دسترس نیستند.",
        });
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
    setFeedback(null);
    try {
      const result = await browserApi<{ data: VideoComment }>(
        `/videos/${encodeURIComponent(videoId)}/comments`,
        { method: "POST", body: JSON.stringify({ body }) },
      );
      setComments((items) => [...items, result.data]);
      setBody("");
      setFeedback({
        tone: "success",
        text:
          result.data.status === "PUBLISHED"
            ? "دیدگاه شما منتشر شد."
            : "دیدگاه شما ثبت شد و برای بررسی در صف قرار گرفت.",
      });
    } catch (caught) {
      const error = caught instanceof Error ? caught.message : "";
      setFeedback({
        tone: "error",
        text: error.includes("Too many comments")
          ? "تعداد ارسال‌ها زیاد است؛ یک دقیقه دیگر دوباره تلاش کنید."
          : "ثبت دیدگاه انجام نشد؛ ابتدا پروفایل را کامل کنید.",
      });
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
          {feedback ? (
            <p
              className={`form-feedback form-feedback-${feedback.tone}`}
              role={feedback.tone === "error" ? "alert" : "status"}
            >
              {feedback.text}
            </p>
          ) : null}
          <div className="video-comment-list">
            {comments.length ? comments.map((comment) => (
              <article className="video-comment" key={comment.id}>
                <div><strong>{comment.authorName}</strong>{comment.status === "PENDING" ? <small>در انتظار بررسی</small> : null}</div>
                <p>{comment.body}</p>
                {comment.status !== "PENDING" ? (
                  <CommentReportAction
                    videoId={videoId}
                    commentId={comment.id}
                    user={user}
                    openAuth={openAuth}
                    onHidden={() =>
                      setComments((items) =>
                        items.filter((item) => item.id !== comment.id),
                      )
                    }
                  />
                ) : null}
                {comment.replies?.map((reply) => (
                  <div className="video-comment-reply" key={reply.id}>
                    <strong>{reply.authorName}</strong>
                    <p>{reply.body}</p>
                    <CommentReportAction
                      videoId={videoId}
                      commentId={reply.id}
                      user={user}
                      openAuth={openAuth}
                      onHidden={() =>
                        setComments((items) =>
                          items.map((item) => ({
                            ...item,
                            replies: item.replies.filter(
                              (candidate) => candidate.id !== reply.id,
                            ),
                          })),
                        )
                      }
                    />
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

function CommentReportAction({
  videoId,
  commentId,
  user,
  openAuth,
  onHidden,
}: {
  videoId: string;
  commentId: string;
  user: ReturnType<typeof useAuth>["user"];
  openAuth: () => void;
  onHidden: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const result = await browserApi<{
        data: { reportCount: number; commentHidden: boolean };
      }>(
        `/videos/${encodeURIComponent(videoId)}/comments/${commentId}/reports`,
        {
          method: "POST",
          body: JSON.stringify({
            reason,
            ...(details.trim() ? { details } : {}),
          }),
        },
      );
      setOpen(false);
      setMessage("گزارش شما ثبت شد.");
      if (result.data.commentHidden) onHidden();
    } catch (caught) {
      const error = caught instanceof Error ? caught.message : "";
      setMessage(
        error.includes("already reported")
          ? "این دیدگاه را قبلاً گزارش کرده‌اید."
          : error.includes("your own comment")
            ? "نمی‌توانید دیدگاه خودتان را گزارش کنید."
            : "ثبت گزارش انجام نشد.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="comment-report-action">
        <button
          type="button"
          onClick={() => {
            if (!user) openAuth();
            else {
              setMessage("");
              setOpen(true);
            }
          }}
        >
          گزارش
        </button>
        {message ? <small role="status">{message}</small> : null}
      </div>
    );
  }

  return (
    <form className="comment-report-form" onSubmit={submit}>
      <label>
        دلیل گزارش
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value as ReportReason)}
        >
          <option value="SPAM">هرزنامه یا تبلیغ</option>
          <option value="HARASSMENT">توهین یا آزار</option>
          <option value="HATEFUL">محتوای نفرت‌پراکن</option>
          <option value="MISINFORMATION">اطلاعات نادرست</option>
          <option value="OTHER">دلیل دیگر</option>
        </select>
      </label>
      <textarea
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        maxLength={500}
        placeholder="توضیح بیشتر، اختیاری"
      />
      <div>
        <button type="submit" disabled={submitting}>
          {submitting ? "در حال ثبت…" : "ثبت گزارش"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMessage("");
            setOpen(false);
          }}
        >
          انصراف
        </button>
      </div>
      {message ? (
        <small className="comment-report-message" role="alert">
          {message}
        </small>
      ) : null}
    </form>
  );
}
