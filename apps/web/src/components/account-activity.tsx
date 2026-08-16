"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import { browserApi } from "@/lib/browser-api";
import type { TravelVideo } from "@/lib/types";

type AccountHotelReview = {
  id: string;
  rating: number;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  hotel: { slug: string; name: string; city: string };
};

type AccountVideoComment = {
  id: string;
  videoId: string;
  parentId: string | null;
  body: string;
  status: string;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
};

type AccountActivityData = {
  hotelReviews: AccountHotelReview[];
  videoComments: AccountVideoComment[];
};

export function AccountActivity() {
  const [visibleReviewCount, setVisibleReviewCount] = useState(4);
  const [visibleCommentCount, setVisibleCommentCount] = useState(4);
  const [activity, setActivity] = useState<AccountActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [videoMetadataById, setVideoMetadataById] = useState(
    new Map<string, TravelVideo>(),
  );
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      browserApi<{ data: AccountActivityData }>("/account/activity"),
      browserApi<{ data: TravelVideo[] }>("/travel-videos"),
    ])
      .then(([{ data: accountActivity }, { data: videos }]) => {
        setActivity(accountActivity);
        setVideoMetadataById(new Map(videos.map((video) => [video.id, video])));
      })
      .catch(() =>
        setFeedback({
          tone: "error",
          text: "فعالیت‌های حساب فعلاً در دسترس نیستند.",
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  async function deleteReview(review: AccountHotelReview) {
    if (!window.confirm(`نظر شما درباره «${review.hotel.name}» حذف شود؟`)) {
      return;
    }
    setDeletingId(review.id);
    setFeedback(null);
    try {
      await browserApi(
        `/hotels/${encodeURIComponent(review.hotel.slug)}/reviews/me`,
        { method: "DELETE" },
      );
      setActivity((current) =>
        current
          ? {
              ...current,
              hotelReviews: current.hotelReviews.filter(
                (item) => item.id !== review.id,
              ),
            }
          : current,
      );
      setFeedback({ tone: "success", text: "نظر هتل حذف شد." });
    } catch {
      setFeedback({ tone: "error", text: "حذف نظر هتل انجام نشد." });
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteComment(comment: AccountVideoComment) {
    if (!window.confirm("این دیدگاه ویدیو حذف شود؟")) return;
    setDeletingId(comment.id);
    setFeedback(null);
    try {
      await browserApi(
        `/account/activity/video-comments/${encodeURIComponent(comment.id)}`,
        { method: "DELETE" },
      );
      setActivity((current) =>
        current
          ? {
              ...current,
              videoComments: current.videoComments.filter(
                (item) => item.id !== comment.id,
              ),
            }
          : current,
      );
      setFeedback({ tone: "success", text: "دیدگاه ویدیو حذف شد." });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setFeedback({
        tone: "error",
        text: message.includes("with replies")
          ? "این دیدگاه پاسخ دارد و برای حفظ پاسخ دیگران قابل حذف نیست."
          : "حذف دیدگاه انجام نشد.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="account-activity-card">
      <div className="account-activity-heading">
        <div>
          <span className="section-eyebrow">مشارکت‌های حساب</span>
          <h1>فعالیت‌های من</h1>
        </div>
        {activity ? (
          <span>
            {(activity.hotelReviews.length + activity.videoComments.length).toLocaleString("fa-IR")} فعالیت
          </span>
        ) : null}
      </div>

      {feedback ? (
        <p
          className={`form-feedback form-feedback-${feedback.tone}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      ) : null}

      {loading ? (
        <p className="account-activity-loading">در حال دریافت فعالیت‌ها…</p>
      ) : activity ? (
        <div className="account-activity-columns">
          <ActivityGroup
            title="نظرهای هتل"
            count={activity.hotelReviews.length}
            emptyText="هنوز برای هتلی امتیاز یا نظر ثبت نکرده‌اید."
            hasMore={visibleReviewCount < activity.hotelReviews.length}
            onShowMore={() => setVisibleReviewCount((count) => count + 4)}
          >
            {activity.hotelReviews.slice(0, visibleReviewCount).map((review) => (
              <article className="account-activity-item" key={review.id}>
                <div className="account-activity-item-heading">
                  <div>
                    <span>⌖ {review.hotel.city}</span>
                    <h3>{review.hotel.name}</h3>
                  </div>
                  <ModerationStatus status={review.status} />
                </div>
                <div
                  className="account-review-rating"
                  aria-label={`${review.rating} از ۵`}
                >
                  <span>{"★".repeat(review.rating)}</span>
                  <i>{"★".repeat(5 - review.rating)}</i>
                </div>
                {review.body ? <p>{review.body}</p> : null}
                <small>آخرین تغییر: {formatActivityDate(review.updatedAt)}</small>
                <div className="account-activity-actions">
                  <Link href={`/hotels/${review.hotel.slug}#hotel-reviews`}>
                    مشاهده و ویرایش
                  </Link>
                  <button
                    type="button"
                    disabled={deletingId === review.id}
                    onClick={() => void deleteReview(review)}
                  >
                    {deletingId === review.id ? "در حال حذف…" : "حذف"}
                  </button>
                </div>
              </article>
            ))}
          </ActivityGroup>

          <ActivityGroup
            title="دیدگاه‌های ویدیو"
            count={activity.videoComments.length}
            emptyText="هنوز برای ویدیویی دیدگاه ثبت نکرده‌اید."
            hasMore={visibleCommentCount < activity.videoComments.length}
            onShowMore={() => setVisibleCommentCount((count) => count + 4)}
          >
            {activity.videoComments.slice(0, visibleCommentCount).map((comment) => {
              const metadata = videoMetadataById.get(comment.videoId);
              return (
                <article className="account-activity-item" key={comment.id}>
                  <div className="account-activity-item-heading">
                    <div>
                      <span>
                        {comment.parentId ? "پاسخ به دیدگاه" : "دیدگاه ویدیو"}
                      </span>
                      <h3>{metadata?.title ?? comment.videoId}</h3>
                    </div>
                    <ModerationStatus status={comment.status} />
                  </div>
                  <p>{comment.body}</p>
                  <small>
                    آخرین تغییر: {formatActivityDate(comment.updatedAt)}
                    {comment.replyCount > 0
                      ? ` · ${comment.replyCount.toLocaleString("fa-IR")} پاسخ`
                      : ""}
                  </small>
                  <div className="account-activity-actions">
                    {metadata ? (
                      <Link
                        href={`/explore?query=${encodeURIComponent(metadata.title)}`}
                      >
                        مشاهده در ویدیوها
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      disabled={deletingId === comment.id}
                      onClick={() => void deleteComment(comment)}
                    >
                      {deletingId === comment.id ? "در حال حذف…" : "حذف"}
                    </button>
                  </div>
                </article>
              );
            })}
          </ActivityGroup>
        </div>
      ) : null}
    </section>
  );
}

function ActivityGroup({
  title,
  count,
  emptyText,
  children,
  hasMore = false,
  onShowMore,
}: {
  title: string;
  count: number;
  emptyText: string;
  children: ReactNode;
  hasMore?: boolean;
  onShowMore?: () => void;
}) {
  return (
    <section className="account-activity-group">
      <div>
        <h3>{title}</h3>
        <span>{count.toLocaleString("fa-IR")}</span>
      </div>
      {count > 0 ? (
        <div className="account-activity-list">
          {children}
          {hasMore ? <button className="account-activity-more" type="button" onClick={onShowMore}>نمایش بیشتر</button> : null}
        </div>
      ) : (
        <p className="account-activity-empty">{emptyText}</p>
      )}
    </section>
  );
}

function ModerationStatus({ status }: { status: string }) {
  return (
    <span
      className={`account-activity-status account-activity-status-${status.toLocaleLowerCase("en-US")}`}
    >
      {moderationLabel(status)}
    </span>
  );
}

function moderationLabel(status: string) {
  if (status === "PUBLISHED") return "منتشرشده";
  if (status === "REJECTED") return "ردشده";
  if (status === "HIDDEN") return "پنهان‌شده";
  return "در انتظار بررسی";
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}
