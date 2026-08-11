"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { browserApi } from "@/lib/browser-api";
import { formatPersianRating } from "@/lib/labels";
import { AdminDeleteAction } from "./admin-delete-action";
import { useAuth } from "./auth-provider";

type PublicReview = {
  id: string;
  rating: number;
  body: string;
  reviewerName: string;
  publishedAt: string | null;
  createdAt: string;
};

type MyReview = {
  id: string;
  rating: number;
  body: string;
  status: string;
};

export function HotelReviews({ hotelSlug, hotelName }: { hotelSlug: string; hotelName: string }) {
  const { user, openAuth } = useAuth();
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState<MyReview | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    browserApi<{
      data: PublicReview[];
      summary: { averageRating: number | null; reviewCount: number };
    }>(`/hotels/${encodeURIComponent(hotelSlug)}/reviews`)
      .then((result) => {
        setReviews(result.data);
        setAverage(result.summary.averageRating);
        setCount(result.summary.reviewCount);
      })
      .catch(() => undefined);
  }, [hotelSlug]);

  useEffect(() => {
    if (!user) return;

    browserApi<{ data: MyReview | null }>(
      `/hotels/${encodeURIComponent(hotelSlug)}/reviews/me`,
    )
      .then(({ data }) => {
        setMine(data);
        setRating(0);
        setBody("");
      })
      .catch(() => undefined);
  }, [hotelSlug, user]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      openAuth();
      return;
    }
    if (!rating) {
      setFeedback({ tone: "error", text: "لطفاً امتیاز هتل را انتخاب کنید." });
      return;
    }
    const normalizedBody = body.trim();
    if (normalizedBody.length > 0 && normalizedBody.length < 3) {
      setFeedback({
        tone: "error",
        text: "متن نظر باید حداقل ۳ کاراکتر باشد.",
      });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const result = await browserApi<{ data: MyReview }>(
        `/hotels/${encodeURIComponent(hotelSlug)}/reviews/me`,
        {
          method: "PUT",
          body: JSON.stringify({
            rating,
            ...(normalizedBody ? { body: normalizedBody } : {}),
          }),
        },
      );
      setMine(result.data);
      setRating(0);
      setBody("");
      setFeedback({
        tone: "success",
        text: "نظر شما ثبت شد و پس از بررسی منتشر می‌شود.",
      });
    } catch {
      setFeedback({
        tone: "error",
        text: "ثبت نظر انجام نشد؛ اطلاعات را بررسی و دوباره تلاش کنید.",
      });
    } finally {
      setSaving(false);
    }
  }

  function removePublishedReview(reviewId: string) {
    if (mine?.id === reviewId) setMine(null);
    setReviews((items) => {
      const next = items.filter((item) => item.id !== reviewId);
      setCount(next.length);
      setAverage(
        next.length
          ? next.reduce((total, item) => total + item.rating, 0) / next.length
          : null,
      );
      return next;
    });
  }

  return (
    <section className="section container hotel-reviews-section">
      <div className="results-header">
        <div>
          <span className="section-eyebrow">تجربه کاربران</span>
          <h2>نظرها درباره {hotelName}</h2>
        </div>
        <div className="review-summary">
          <strong>
            {average === null ? "—" : formatPersianRating(average)}
          </strong>
          <span>از ۵</span>
          <small>{count.toLocaleString("fa-IR")} نظر</small>
        </div>
      </div>

      <div className="hotel-reviews-layout">
        <form className="review-form" onSubmit={submitReview}>
          <h3>امتیاز یا تجربه‌تان را ثبت کنید</h3>
          {!user ? (
            <>
              <p>برای ثبت امتیاز یا نظر، وارد حساب هتل‌یاب شوید.</p>
              <button className="button" type="button" onClick={openAuth}>ورود و ثبت نظر</button>
            </>
          ) : (
            <>
              <div className="review-stars" aria-label="امتیاز هتل">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    className={value <= rating ? "review-star-active" : undefined}
                    type="button"
                    key={value}
                    onClick={() => setRating(value)}
                    aria-label={`${value} از ۵`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={2000}
                placeholder="نکته‌ای که به انتخاب دیگران کمک می‌کند…"
              />
              {mine ? (
                <span className="moderation-badge">
                  نظر قبلی شما: {moderationLabel(mine.status)}
                </span>
              ) : null}
              {feedback ? (
                <p
                  className={`form-feedback form-feedback-${feedback.tone}`}
                  role={feedback.tone === "error" ? "alert" : "status"}
                >
                  {feedback.text}
                </p>
              ) : null}
              <button className="button" type="submit" disabled={saving}>
                {saving
                  ? "در حال ثبت…"
                  : mine
                    ? "ثبت و جایگزینی نظر قبلی"
                    : "ثبت نظر"}
              </button>
            </>
          )}
        </form>

        <div className="published-reviews">
          {reviews.length ? reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div className="review-card-heading">
                <strong>{review.reviewerName}</strong>
                <span>{"★".repeat(review.rating)}<i>{"★".repeat(5 - review.rating)}</i></span>
              </div>
              {review.body ? <p>{review.body}</p> : null}
              <small>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(review.publishedAt ?? review.createdAt))}</small>
              {user?.role === "ADMIN" ? (
                <AdminDeleteAction
                  endpoint={`/admin/moderation/hotel-reviews/${encodeURIComponent(review.id)}`}
                  itemLabel="نظر"
                  onDeleted={() => removePublishedReview(review.id)}
                />
              ) : null}
            </article>
          )) : (
            <div className="reviews-empty">
              <strong>هنوز نظری منتشر نشده</strong>
              <p>اولین تجربهٔ مفید درباره این هتل را شما ثبت کنید.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function moderationLabel(status: string) {
  if (status === "PUBLISHED") return "منتشرشده";
  if (status === "REJECTED") return "ردشده";
  if (status === "HIDDEN") return "پنهان‌شده";
  return "در انتظار بررسی";
}
