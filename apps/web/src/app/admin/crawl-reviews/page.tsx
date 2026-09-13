"use client";

import Link from "next/link";
import {
  type DragEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SiteIcon } from "@/components/site-icon";
import { useAuth } from "@/components/auth-provider";
import { browserApi } from "@/lib/browser-api";

type BatchStatus = "REVIEWING" | "READY" | "COMPLETED";
type ItemStatus = "PENDING" | "APPROVED" | "REJECTED";
type ProcessingStatus = "IDLE" | "RUNNING" | "SUCCEEDED" | "FAILED";
type Counts = { PENDING: number; APPROVED: number; REJECTED: number };

type ReviewDestination = {
  id: string;
  type: "CITY" | "PROVINCE";
  slug: string;
  name: string;
  parentProvinceId: string | null;
};

type ReviewHotel = {
  id: string;
  slug: string;
  name: string;
  city: string;
};

type ReviewBatchSummary = {
  id: string;
  instagramUsername: string;
  sourceFilename: string;
  status: BatchStatus;
  processingStatus: ProcessingStatus;
  processingStartedAt: string | null;
  processingFinishedAt: string | null;
  processingLog?: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalItems: number;
  counts: Counts;
};

type ReviewItem = {
  id: string;
  displayOrder: number;
  sourceUrl: string;
  shortcode: string;
  instagramUsername: string;
  reviewStatus: ItemStatus;
  hotelId: string | null;
  hotelName: string | null;
  cityIds: string[];
  provinceIds: string[];
  finalTitle: string | null;
  updatedAt: string;
};

type ReviewBatch = Omit<ReviewBatchSummary, "totalItems"> & {
  items: ReviewItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

type Bootstrap = {
  destinations: ReviewDestination[];
  hotels: ReviewHotel[];
  batches: ReviewBatchSummary[];
};

type Feedback = { tone: "error" | "success"; text: string } | null;

export default function CrawlReviewsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [activeList, setActiveList] = useState<"REVIEWING" | "REVIEWED">(
    "REVIEWING",
  );
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [batch, setBatch] = useState<ReviewBatch | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBootstrap = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await browserApi<{ data: Bootstrap }>(
        "/admin/crawl-reviews/bootstrap",
      );
      setBootstrap(response.data);
    } catch (caught) {
      setFeedback({
        tone: "error",
        text:
          caught instanceof Error
            ? caught.message
            : "دریافت فایل‌های بررسی انجام نشد.",
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const loadBatch = useCallback(async (id: string, nextPage: number) => {
    if (!id) return;
    setBatchLoading(true);
    try {
      const response = await browserApi<{ data: ReviewBatch }>(
        `/admin/crawl-reviews/${encodeURIComponent(id)}?page=${nextPage}&pageSize=12`,
      );
      setBatch(response.data);
    } catch (caught) {
      setFeedback({
        tone: "error",
        text:
          caught instanceof Error
            ? caught.message
            : "دریافت ردیف‌های بررسی انجام نشد.",
      });
    } finally {
      setBatchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (user?.role === "ADMIN" || user?.role === "MODERATOR") {
        void loadBootstrap();
      } else if (!authLoading) {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [authLoading, loadBootstrap, user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (selectedBatchId) void loadBatch(selectedBatchId, page);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadBatch, page, selectedBatchId]);

  useEffect(() => {
    if (batch?.processingStatus !== "RUNNING" || !selectedBatchId) return;
    const interval = window.setInterval(() => {
      void Promise.all([
        loadBootstrap(false),
        loadBatch(selectedBatchId, page),
      ]);
    }, 4_000);
    return () => window.clearInterval(interval);
  }, [
    batch?.processingStatus,
    loadBatch,
    loadBootstrap,
    page,
    selectedBatchId,
  ]);

  const visibleBatches = useMemo(
    () =>
      (bootstrap?.batches ?? []).filter((item) =>
        activeList === "REVIEWING"
          ? item.status === "REVIEWING"
          : item.status !== "REVIEWING",
      ),
    [activeList, bootstrap],
  );

  async function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".json")) {
      setFeedback({
        tone: "error",
        text: "فقط فایل JSON خروجی کرالر را انتخاب کنید.",
      });
      return;
    }
    setUploading(true);
    setFeedback(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await browserApi<{
        data: { id: string; instagramUsername: string; totalItems: number };
      }>("/admin/crawl-reviews/upload", { method: "POST", body });
      await loadBootstrap(false);
      setActiveList("REVIEWING");
      setSelectedBatchId(response.data.id);
      setPage(1);
      setFeedback({
        tone: "success",
        text: `${response.data.totalItems.toLocaleString("fa-IR")} ردیف برای @${response.data.instagramUsername} وارد صف بررسی شد.`,
      });
    } catch (caught) {
      setFeedback({
        tone: "error",
        text:
          caught instanceof Error ? caught.message : "بارگذاری فایل انجام نشد.",
      });
    } finally {
      setUploading(false);
    }
  }

  function dropFile(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void upload(file);
  }

  async function refreshCurrent() {
    await Promise.all([
      loadBootstrap(false),
      selectedBatchId ? loadBatch(selectedBatchId, page) : Promise.resolve(),
    ]);
  }

  async function finishReview() {
    if (!batch) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await browserApi(`/admin/crawl-reviews/${batch.id}/finish-review`, {
        method: "POST",
      });
      await refreshCurrent();
      setActiveList("REVIEWED");
      setFeedback({ tone: "success", text: "فایل وارد بخش بررسی‌شده‌ها شد." });
    } catch (caught) {
      setFeedback({
        tone: "error",
        text:
          caught instanceof Error ? caught.message : "پایان بررسی انجام نشد.",
      });
    } finally {
      setBusyAction(false);
    }
  }

  async function downloadExport() {
    if (!batch) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      const payload = await browserApi<Record<string, unknown>>(
        `/admin/crawl-reviews/${batch.id}/export`,
      );
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${batch.instagramUsername}.reviewed.json`;
      anchor.click();
      URL.revokeObjectURL(href);
      setFeedback({
        tone: "success",
        text: "فایل آمادهٔ دانلود رسانه ساخته شد.",
      });
    } catch (caught) {
      setFeedback({
        tone: "error",
        text:
          caught instanceof Error ? caught.message : "ساخت خروجی انجام نشد.",
      });
    } finally {
      setBusyAction(false);
    }
  }

  async function completeBatch() {
    if (!batch) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await browserApi(`/admin/crawl-reviews/${batch.id}/complete`, {
        method: "POST",
      });
      await refreshCurrent();
      setFeedback({
        tone: "success",
        text: "این فایل به‌عنوان پایان‌یافته ثبت شد.",
      });
    } catch (caught) {
      setFeedback({
        tone: "error",
        text:
          caught instanceof Error ? caught.message : "ثبت پایان کار انجام نشد.",
      });
    } finally {
      setBusyAction(false);
    }
  }

  async function processBatch() {
    if (!batch) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await browserApi(`/admin/crawl-reviews/${batch.id}/process`, {
        method: "POST",
      });
      await refreshCurrent();
      setFeedback({
        tone: "success",
        text: "دانلود رسانه‌ها و ورود داده در پس‌زمینه شروع شد.",
      });
    } catch (caught) {
      setFeedback({
        tone: "error",
        text:
          caught instanceof Error ? caught.message : "شروع پردازش انجام نشد.",
      });
    } finally {
      setBusyAction(false);
    }
  }

  async function deleteBatch() {
    if (!batch) return;
    setDeleteOpen(false);
    setBusyAction(true);
    setFeedback(null);
    try {
      await browserApi(`/admin/crawl-reviews/${batch.id}`, {
        method: "DELETE",
      });
      setSelectedBatchId("");
      setBatch(null);
      setPage(1);
      await loadBootstrap(false);
      setFeedback({ tone: "success", text: "فایل بررسی حذف شد." });
    } catch (caught) {
      setFeedback({
        tone: "error",
        text: caught instanceof Error ? caught.message : "حذف فایل انجام نشد.",
      });
    } finally {
      setBusyAction(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="section container admin-page">
        <p>در حال دریافت صف بررسی…</p>
      </main>
    );
  }
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    return (
      <main className="section container admin-page">
        <section className="admin-empty">
          <span className="section-eyebrow">بررسی داده‌های کرال‌شده</span>
          <h1>دسترسی مدیریت لازم است</h1>
          <p>این بخش فقط برای مدیر و ناظر محتوا در دسترس است.</p>
          <Link className="button" href="/">
            بازگشت به سایت
          </Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="section container admin-page crawl-review-page">
        <header className="admin-heading crawl-review-heading">
          <div>
            <span className="section-eyebrow">خط تولید محتوای اینستاگرام</span>
            <h1>بررسی داده‌های کرال‌شده</h1>
            <p>
              خروجی JSON کرالر را بارگذاری کنید و ردیف‌ها را مستقیماً در پنل
              بررسی کنید.
            </p>
          </div>
          <div className="catalog-heading-actions">
            <Link href="/admin/catalog">مدیریت داده‌ها</Link>
            <Link href="/admin/moderation">بررسی محتوای کاربران</Link>
          </div>
        </header>

        <button
          type="button"
          className={`crawl-review-upload${dragging ? " is-dragging" : ""}`}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              setDragging(false);
          }}
          onDrop={dropFile}
        >
          <SiteIcon name="review-table" />
          <span>
            <strong>
              {uploading
                ? "در حال ساخت فایل بررسی…"
                : "افزودن خروجی جدید کرالر"}
            </strong>
            <small>فایل JSON را اینجا رها کنید یا از دستگاه انتخاب کنید.</small>
          </span>
        </button>
        <input
          ref={fileInputRef}
          className="catalog-upload-file-input"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />

        {feedback ? (
          <p
            className={`form-feedback form-feedback-${feedback.tone}`}
            role={feedback.tone === "error" ? "alert" : "status"}
          >
            {feedback.text}
          </p>
        ) : null}

        <div className="crawl-review-layout">
          <aside className="crawl-review-batches">
            <nav className="catalog-tabs" aria-label="وضعیت فایل‌های بررسی">
              <button
                type="button"
                className={activeList === "REVIEWING" ? "is-active" : ""}
                onClick={() => {
                  setActiveList("REVIEWING");
                  setSelectedBatchId("");
                  setBatch(null);
                  setPage(1);
                }}
              >
                بررسی‌نشده
              </button>
              <button
                type="button"
                className={activeList === "REVIEWED" ? "is-active" : ""}
                onClick={() => {
                  setActiveList("REVIEWED");
                  setSelectedBatchId("");
                  setBatch(null);
                  setPage(1);
                }}
              >
                بررسی‌شده
              </button>
            </nav>
            <div className="crawl-review-batch-list">
              {visibleBatches.length ? (
                visibleBatches.map((item) => (
                  <button
                    type="button"
                    className={selectedBatchId === item.id ? "is-active" : ""}
                    key={item.id}
                    onClick={() => {
                      setSelectedBatchId(item.id);
                      setPage(1);
                      setFeedback(null);
                    }}
                  >
                    <span>
                      <strong>@{item.instagramUsername}</strong>
                      <small>{item.sourceFilename}</small>
                    </span>
                    <span
                      className={`crawl-review-badge crawl-review-badge-${item.status.toLowerCase()}`}
                    >
                      {batchStatusLabel(item.status)}
                    </span>
                    <span className="crawl-review-counts">
                      <small>
                        {item.counts.PENDING.toLocaleString("fa-IR")} مانده
                      </small>
                      <small>
                        {item.counts.APPROVED.toLocaleString("fa-IR")} تأیید
                      </small>
                      <small>
                        {item.counts.REJECTED.toLocaleString("fa-IR")} رد
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <p className="crawl-review-empty">فایلی در این بخش نیست.</p>
              )}
            </div>
          </aside>

          <section className="crawl-review-workspace">
            {!selectedBatchId ? (
              <div className="catalog-edit-empty">
                <SiteIcon name="review-table" />
                <p>یک فایل را برای مشاهده و بررسی ردیف‌ها انتخاب کنید.</p>
              </div>
            ) : batchLoading || !batch ? (
              <p>در حال دریافت ردیف‌ها…</p>
            ) : (
              <>
                <header className="crawl-review-workspace-heading">
                  <div>
                    <span
                      className={`crawl-review-badge crawl-review-badge-${batch.status.toLowerCase()}`}
                    >
                      {batchStatusLabel(batch.status)}
                    </span>
                    <h2>@{batch.instagramUsername}</h2>
                    <p>
                      {batch.pagination.totalItems.toLocaleString("fa-IR")}{" "}
                      محتوا · صفحه{" "}
                      {batch.pagination.page.toLocaleString("fa-IR")} از{" "}
                      {batch.pagination.totalPages.toLocaleString("fa-IR")}
                    </p>
                  </div>
                  <div className="crawl-review-workspace-actions">
                    {batch.status === "REVIEWING" ? (
                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={busyAction}
                        onClick={() => void finishReview()}
                      >
                        پایان بررسی
                      </button>
                    ) : (
                      <button
                        className="button"
                        type="button"
                        disabled={busyAction}
                        onClick={() => void downloadExport()}
                      >
                        دریافت فایل آماده
                      </button>
                    )}
                    {batch.status === "READY" ? (
                      <>
                        {user.role === "MODERATOR" ? (
                          <button
                            className="button"
                            type="button"
                            disabled={
                              busyAction ||
                              batch.processingStatus === "RUNNING"
                            }
                            onClick={() => void processBatch()}
                          >
                            {batch.processingStatus === "RUNNING"
                              ? "در حال پردازش…"
                              : batch.processingStatus === "FAILED"
                                ? "تلاش دوباره برای ورود مستقیم"
                                : "دانلود و ورود مستقیم به سایت"}
                          </button>
                        ) : null}
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={
                            busyAction || batch.processingStatus === "RUNNING"
                          }
                          onClick={() => void completeBatch()}
                        >
                          پایان دستی پردازش
                        </button>
                      </>
                    ) : null}
                    <button
                      className="catalog-delete"
                      type="button"
                      disabled={busyAction}
                      onClick={() => setDeleteOpen(true)}
                    >
                      حذف فایل
                    </button>
                  </div>
                </header>

                {batch.processingStatus !== "IDLE" ? (
                  <section
                    className={`crawl-review-processing crawl-review-processing-${batch.processingStatus.toLowerCase()}`}
                    aria-live="polite"
                  >
                    <strong>
                      {processingStatusLabel(batch.processingStatus)}
                    </strong>
                    {batch.processingLog ? (
                      <details open={batch.processingStatus === "FAILED"}>
                        <summary>جزئیات پردازش</summary>
                        <pre dir="ltr">{batch.processingLog}</pre>
                      </details>
                    ) : null}
                  </section>
                ) : null}

                <div className="crawl-review-items">
                  {batch.items.map((item) => (
                    <ReviewItemForm
                      key={`${item.id}-${item.updatedAt}`}
                      item={item}
                      destinations={bootstrap?.destinations ?? []}
                      hotels={bootstrap?.hotels ?? []}
                      disabled={batch.status === "COMPLETED"}
                      onSaved={refreshCurrent}
                      onFeedback={setFeedback}
                    />
                  ))}
                </div>

                {batch.pagination.totalPages > 1 ? (
                  <nav
                    className="pagination crawl-review-pagination"
                    aria-label="صفحه‌بندی ردیف‌ها"
                  >
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      قبلی
                    </button>
                    <span>
                      صفحه {page.toLocaleString("fa-IR")} از{" "}
                      {batch.pagination.totalPages.toLocaleString("fa-IR")}
                    </span>
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={page >= batch.pagination.totalPages}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      بعدی
                    </button>
                  </nav>
                ) : null}
              </>
            )}
          </section>
        </div>
      </main>

      <ConfirmDialog
        open={deleteOpen}
        title="حذف فایل بررسی"
        description={`فایل ${batch ? `@${batch.instagramUsername}` : "انتخاب‌شده"} و تمام ردیف‌های آن حذف شود؟`}
        confirmLabel="حذف دائمی"
        danger
        busy={busyAction}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteBatch()}
      />
    </>
  );
}

function ReviewItemForm({
  item,
  destinations,
  hotels,
  disabled,
  onSaved,
  onFeedback,
}: {
  item: ReviewItem;
  destinations: ReviewDestination[];
  hotels: ReviewHotel[];
  disabled: boolean;
  onSaved: () => Promise<void>;
  onFeedback: (feedback: Feedback) => void;
}) {
  const [reviewStatus, setReviewStatus] = useState<ItemStatus>(
    item.reviewStatus,
  );
  const [hotelName, setHotelName] = useState(item.hotelName ?? "");
  const [cityIds, setCityIds] = useState(item.cityIds);
  const [provinceIds, setProvinceIds] = useState(item.provinceIds);
  const [finalTitle, setFinalTitle] = useState(item.finalTitle ?? "");
  const [saving, setSaving] = useState(false);
  const knownHotel = hotels.find(
    (hotel) => normalizeText(hotel.name) === normalizeText(hotelName),
  );
  const cities = destinations.filter(
    (destination) => destination.type === "CITY",
  );
  const provinces = destinations.filter(
    (destination) => destination.type === "PROVINCE",
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    onFeedback(null);
    try {
      await browserApi(`/admin/crawl-reviews/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          reviewStatus,
          hotelId: knownHotel?.id ?? null,
          hotelName: hotelName.trim() || null,
          cityIds,
          provinceIds,
          finalTitle: finalTitle.trim() || null,
        }),
      });
      await onSaved();
      onFeedback({
        tone: "success",
        text: `ردیف ${item.displayOrder.toLocaleString("fa-IR")} ذخیره شد.`,
      });
    } catch (caught) {
      onFeedback({
        tone: "error",
        text:
          caught instanceof Error ? caught.message : "ذخیره ردیف انجام نشد.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={`crawl-review-item crawl-review-item-${reviewStatus.toLowerCase()}`}
      onSubmit={save}
    >
      <header>
        <span className="crawl-review-row-number">
          ردیف {item.displayOrder.toLocaleString("fa-IR")}
        </span>
        <a href={item.sourceUrl} target="_blank" rel="noreferrer">
          مشاهده محتوای اینستاگرام
          <SiteIcon name="external-link" />
        </a>
        <code dir="ltr">{item.shortcode}</code>
      </header>
      <div className="crawl-review-item-fields">
        <label>
          وضعیت بررسی
          <select
            value={reviewStatus}
            disabled={disabled}
            onChange={(event) =>
              setReviewStatus(event.target.value as ItemStatus)
            }
          >
            <option value="PENDING">در انتظار بررسی</option>
            <option value="APPROVED">تأیید</option>
            <option value="REJECTED">رد</option>
          </select>
        </label>
        <label>
          هتل
          <input
            value={hotelName}
            disabled={disabled}
            list={`hotels-${item.id}`}
            placeholder="اختیاری؛ نام هتل"
            onChange={(event) => setHotelName(event.target.value)}
          />
          <datalist id={`hotels-${item.id}`}>
            {hotels.map((hotel) => (
              <option value={hotel.name} key={hotel.id}>
                {hotel.city}
              </option>
            ))}
          </datalist>
        </label>
        <DestinationMultiPicker
          label="شهر"
          options={cities}
          selected={cityIds}
          disabled={disabled}
          onChange={setCityIds}
        />
        <DestinationMultiPicker
          label="استان"
          options={provinces}
          selected={provinceIds}
          disabled={disabled}
          onChange={setProvinceIds}
        />
        <label className="crawl-review-title-field">
          عنوان نهایی
          <input
            value={finalTitle}
            disabled={disabled}
            maxLength={240}
            placeholder="عنوانی که در سایت نمایش داده می‌شود"
            onChange={(event) => setFinalTitle(event.target.value)}
          />
        </label>
      </div>
      {!disabled ? (
        <footer>
          <span>
            {reviewStatus === "APPROVED"
              ? "عنوان و حداقل یک استان الزامی است."
              : reviewStatus === "REJECTED"
                ? "این محتوا وارد سایت نمی‌شود."
                : "پس از تصمیم، وضعیت را تغییر دهید."}
          </span>
          <button
            className="button button-small"
            type="submit"
            disabled={saving}
          >
            {saving ? "در حال ذخیره…" : "ذخیره ردیف"}
          </button>
        </footer>
      ) : null}
    </form>
  );
}

function DestinationMultiPicker({
  label,
  options,
  selected,
  disabled,
  onChange,
}: {
  label: string;
  options: ReviewDestination[];
  selected: string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = options.filter((option) =>
    normalizeText(option.name).includes(normalizeText(query)),
  );
  const selectedOptions = selected
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is ReviewDestination => Boolean(option));

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    );
  }

  return (
    <div className="crawl-review-destination-picker">
      <span>{label}</span>
      <details>
        <summary>
          {selectedOptions.length
            ? selectedOptions.map((option) => option.name).join("، ")
            : `انتخاب ${label}`}
        </summary>
        <div>
          <input
            type="search"
            value={query}
            disabled={disabled}
            placeholder={`جست‌وجوی ${label}`}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="crawl-review-destination-options">
            {visible.map((option) => (
              <button
                type="button"
                disabled={disabled}
                className={selected.includes(option.id) ? "is-selected" : ""}
                key={option.id}
                onClick={() => toggle(option.id)}
              >
                {option.name}
                {selected.includes(option.id) ? (
                  <SiteIcon name="check" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

function batchStatusLabel(status: BatchStatus) {
  if (status === "READY") return "آمادهٔ دریافت";
  if (status === "COMPLETED") return "پایان‌یافته";
  return "در حال بررسی";
}

function processingStatusLabel(status: ProcessingStatus) {
  if (status === "RUNNING") return "پردازش مستقیم در حال اجرا است";
  if (status === "SUCCEEDED") return "دانلود و ورود مستقیم با موفقیت انجام شد";
  if (status === "FAILED") return "پردازش مستقیم ناموفق بود";
  return "پردازش مستقیم شروع نشده است";
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("fa-IR")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ");
}
