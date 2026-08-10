"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { browserApi } from "@/lib/browser-api";

type ModerationStatus = "PENDING" | "PUBLISHED" | "REJECTED" | "HIDDEN";
type QueueUser = {
  username: string | null;
  displayName: string;
  mobile: string;
};
type HotelReviewItem = {
  id: string;
  rating: number;
  body: string;
  status: ModerationStatus;
  moderationNote: string | null;
  createdAt: string;
  hotel: { slug: string; name: string };
  user: QueueUser;
};
type VideoCommentItem = {
  id: string;
  videoId: string;
  parentId: string | null;
  body: string;
  status: ModerationStatus;
  moderationNote: string | null;
  createdAt: string;
  user: QueueUser;
};
type Queue = {
  hotelReviews: HotelReviewItem[];
  videoComments: VideoCommentItem[];
};

const statusOptions: Array<{ value: ModerationStatus; label: string }> = [
  { value: "PENDING", label: "در انتظار بررسی" },
  { value: "PUBLISHED", label: "منتشرشده" },
  { value: "REJECTED", label: "ردشده" },
  { value: "HIDDEN", label: "پنهان‌شده" },
];

export default function ModerationPage() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<ModerationStatus>("PENDING");
  const [queue, setQueue] = useState<Queue>({
    hotelReviews: [],
    videoComments: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await browserApi<{ data: Queue }>(
        `/admin/moderation/queue?status=${status}`,
      );
      setQueue(result.data);
    } catch {
      setError("دریافت صف بررسی انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) return;
    const timeout = window.setTimeout(() => void loadQueue(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadQueue, user]);

  async function moderate(
    kind: "hotel-reviews" | "video-comments",
    id: string,
    nextStatus: ModerationStatus,
    moderationNote: string,
  ) {
    await browserApi(`/admin/moderation/${kind}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus, moderationNote }),
    });
    await loadQueue();
  }

  if (authLoading)
    return (
      <main className="section container admin-page">
        <p>در حال بررسی دسترسی…</p>
      </main>
    );
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    return (
      <main className="section container admin-page">
        <section className="admin-empty">
          <span className="section-eyebrow">پنل مدیریت</span>
          <h1>دسترسی مدیریت لازم است</h1>
          <p>این صفحه فقط برای مدیر و ناظر محتوا در دسترس است.</p>
          <Link className="button" href="/">
            بازگشت به سایت
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="section container admin-page">
      <header className="admin-heading">
        <div>
          <span className="section-eyebrow">مدیریت محتوای کاربران</span>
          <h1>صف بررسی</h1>
          <p>نظرهای هتل و کامنت‌های ویدیو پس از تصمیم شما عمومی می‌شوند.</p>
        </div>
        <label>
          نمایش وضعیت
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ModerationStatus)
            }
          >
            {statusOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p>در حال دریافت محتوا…</p>
      ) : (
        <div className="moderation-columns">
          <ModerationSection
            title="نظرهای هتل"
            count={queue.hotelReviews.length}
          >
            {queue.hotelReviews.map((item) => (
              <ModerationCard
                key={item.id}
                title={
                  <Link href={`/hotels/${item.hotel.slug}`}>
                    {item.hotel.name}
                  </Link>
                }
                meta={`${item.rating.toLocaleString("fa-IR")} از ۵ · ${item.user.displayName}`}
                user={item.user}
                body={item.body || "فقط امتیاز ثبت شده است."}
                initialNote={item.moderationNote}
                status={status}
                onModerate={(nextStatus, note) =>
                  moderate("hotel-reviews", item.id, nextStatus, note)
                }
              />
            ))}
          </ModerationSection>

          <ModerationSection
            title="کامنت‌های ویدیو"
            count={queue.videoComments.length}
          >
            {queue.videoComments.map((item) => (
              <ModerationCard
                key={item.id}
                title={
                  <>
                    ویدیو <bdi dir="ltr">{item.videoId}</bdi>
                  </>
                }
                meta={
                  item.parentId
                    ? `پاسخ · ${item.user.displayName}`
                    : item.user.displayName
                }
                user={item.user}
                body={item.body}
                initialNote={item.moderationNote}
                status={status}
                onModerate={(nextStatus, note) =>
                  moderate("video-comments", item.id, nextStatus, note)
                }
              />
            ))}
          </ModerationSection>
        </div>
      )}
    </main>
  );
}

function ModerationSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="moderation-section">
      <div className="moderation-section-title">
        <h2>{title}</h2>
        <span>{count.toLocaleString("fa-IR")}</span>
      </div>
      {count ? (
        <div className="moderation-list">{children}</div>
      ) : (
        <p className="moderation-empty">موردی در این وضعیت وجود ندارد.</p>
      )}
    </section>
  );
}

function ModerationCard({
  title,
  meta,
  user,
  body,
  initialNote,
  status,
  onModerate,
}: {
  title: ReactNode;
  meta: string;
  user: QueueUser;
  body: string;
  initialNote: string | null;
  status: ModerationStatus;
  onModerate: (status: ModerationStatus, note: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [cardError, setCardError] = useState("");

  async function submit(
    form: HTMLFormElement | null,
    nextStatus: ModerationStatus,
  ) {
    if (!form) return;
    setSaving(true);
    setCardError("");
    const note = String(new FormData(form).get("moderationNote") ?? "");
    try {
      await onModerate(nextStatus, note);
    } catch {
      setCardError("ثبت تصمیم انجام نشد.");
      setSaving(false);
    }
  }

  return (
    <article className="moderation-card">
      <div className="moderation-card-heading">
        <h3>{title}</h3>
        <span>{meta}</span>
      </div>
      <p>{body}</p>
      <small>
        @{user.username ?? "بدون‌نام‌کاربری"} ·{" "}
        <bdi dir="ltr">{user.mobile}</bdi>
      </small>
      <form>
        <label>
          یادداشت داخلی <small>اختیاری</small>
          <textarea
            name="moderationNote"
            defaultValue={initialNote ?? ""}
            maxLength={1000}
          />
        </label>
        {cardError ? <p className="auth-error">{cardError}</p> : null}
        <div className="moderation-actions">
          {status !== "PUBLISHED" ? (
            <button
              type="button"
              className="button button-small"
              disabled={saving}
              onClick={(event) =>
                void submit(event.currentTarget.form, "PUBLISHED")
              }
            >
              تأیید و انتشار
            </button>
          ) : null}
          {status !== "REJECTED" ? (
            <button
              type="button"
              className="button button-small button-danger"
              disabled={saving}
              onClick={(event) =>
                void submit(event.currentTarget.form, "REJECTED")
              }
            >
              رد
            </button>
          ) : null}
          {status === "PUBLISHED" ? (
            <button
              type="button"
              className="button button-small button-secondary"
              disabled={saving}
              onClick={(event) =>
                void submit(event.currentTarget.form, "HIDDEN")
              }
            >
              پنهان‌کردن
            </button>
          ) : null}
          {status !== "PENDING" ? (
            <button
              type="button"
              className="button-link"
              disabled={saving}
              onClick={(event) =>
                void submit(event.currentTarget.form, "PENDING")
              }
            >
              بازگرداندن به صف
            </button>
          ) : null}
        </div>
      </form>
    </article>
  );
}
