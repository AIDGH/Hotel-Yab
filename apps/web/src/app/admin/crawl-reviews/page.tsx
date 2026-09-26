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
import { BROWSER_API_BASE_URL, browserApi } from "@/lib/browser-api";

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

type ReviewPerson = {
  id: string;
  slug: string;
  displayName: string;
  instagramHandle: string;
  imageUrl: string | null;
  instagramCrawlRequest: {
    version: 1;
    url: string;
    headers: Record<string, string>;
    body: string;
  } | null;
  instagramCrawlRequestUpdatedAt: string | null;
};

type WorkerJob = {
  id: string;
  kind: "CRAWL" | "PROCESS";
  username: string;
  status: "QUEUED" | "RUNNING" | "PAUSED" | "FAILED" | "SUCCEEDED";
  message: string;
  current: number;
  total: number | null;
  newItems: number;
  hasResult: boolean;
  logs: string[];
  batchId: string | null;
};

type StoredWorkerJob = {
  id: string;
  kind: WorkerJob["kind"];
  batchId: string | null;
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
  preview: {
    mediaType: "IMAGE" | "VIDEO";
    mediaUrl: string | null;
    thumbnailUrl: string | null;
    itemCount: number;
  } | null;
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
  notablePeople: ReviewPerson[];
  batches: ReviewBatchSummary[];
};

type Feedback = { tone: "error" | "success"; text: string } | null;

const LOCAL_WORKER_URL = "http://127.0.0.1:4317";
const LOCAL_JOB_STORAGE_KEY = "hotel-yab-local-crawl-job";

function readStoredWorkerJob(): StoredWorkerJob | null {
  const stored = window.localStorage.getItem(LOCAL_JOB_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as StoredWorkerJob;
    return parsed?.id ? parsed : null;
  } catch {
    return { id: stored, kind: "CRAWL", batchId: null };
  }
}

function storeWorkerJob(job: WorkerJob) {
  window.localStorage.setItem(
    LOCAL_JOB_STORAGE_KEY,
    JSON.stringify({ id: job.id, kind: job.kind, batchId: job.batchId }),
  );
}

async function localWorkerApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${LOCAL_WORKER_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? "ارتباط با برنامه کرالر انجام نشد.");
  }
  return payload;
}

function expectedWorkerEnvironment(): "local" | "production" {
  if (typeof window === "undefined") return "local";
  return window.location.hostname === "hotelyab.jaryan.net"
    ? "production"
    : "local";
}

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
  const [workerReady, setWorkerReady] = useState(false);
  const [workerEnvironment, setWorkerEnvironment] = useState<
    "local" | "production" | null
  >(null);
  const [workerVersion, setWorkerVersion] = useState<number | null>(null);
  const workerOutdated = workerVersion !== null && workerVersion < 2;
  const workerInWrongEnvironment =
    workerEnvironment !== null &&
    workerEnvironment !== expectedWorkerEnvironment();
  const [workerJob, setWorkerJob] = useState<WorkerJob | null>(null);
  const [selectedInstagram, setSelectedInstagram] = useState("");
  const [selectedBrowser, setSelectedBrowser] = useState("chrome");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importedWorkerJobs = useRef(new Set<string>());

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

  const checkWorker = useCallback(async () => {
    try {
      const response = await localWorkerApi<{
        data: {
          ready: boolean;
          version: number;
          environment: "local" | "production";
        };
      }>("/health");
      setWorkerReady(
        response.data.ready &&
          response.data.version >= 2 &&
          response.data.environment === expectedWorkerEnvironment(),
      );
      setWorkerEnvironment(response.data.environment);
      setWorkerVersion(response.data.version);
    } catch {
      setWorkerReady(false);
      setWorkerEnvironment(null);
      setWorkerVersion(null);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void checkWorker(), 0);
    const interval = window.setInterval(() => void checkWorker(), 8_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [checkWorker]);

  useEffect(() => {
    const storedJob = readStoredWorkerJob();
    const workerJobFinished =
      workerJob && !["QUEUED", "RUNNING"].includes(workerJob.status);
    if (!workerReady || workerJobFinished || (!workerJob && !storedJob)) return;
    const jobId = workerJob?.id ?? storedJob?.id;
    if (!jobId) return;
    const activeJobId = jobId;
    let cancelled = false;
    async function poll() {
      try {
        const response = await localWorkerApi<{ data: WorkerJob }>(
          `/jobs/${encodeURIComponent(activeJobId)}`,
        );
        if (!["QUEUED", "RUNNING"].includes(response.data.status)) {
          if (
            response.data.kind === "PROCESS" ||
            response.data.status !== "SUCCEEDED"
          ) {
            window.localStorage.removeItem(LOCAL_JOB_STORAGE_KEY);
          }
          if (response.data.kind === "PROCESS") {
            void Promise.all([
              loadBootstrap(false),
              response.data.batchId
                ? loadBatch(response.data.batchId, page)
                : Promise.resolve(),
            ]);
          }
        }
        if (!cancelled) setWorkerJob(response.data);
      } catch {
        window.localStorage.removeItem(LOCAL_JOB_STORAGE_KEY);
        if (storedJob?.kind === "PROCESS" && storedJob.batchId) {
          void browserApi(
            `/admin/crawl-reviews/${storedJob.batchId}/local-reset`,
            { method: "POST" },
          ).then(() => loadBootstrap(false));
        }
        if (!cancelled) setWorkerJob(null);
      }
    }
    void poll();
    const interval = window.setInterval(() => void poll(), 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadBatch, loadBootstrap, page, workerJob, workerReady]);

  const visibleBatches = useMemo(
    () =>
      (bootstrap?.batches ?? []).filter((item) =>
        activeList === "REVIEWING"
          ? item.status === "REVIEWING"
          : item.status !== "REVIEWING",
      ),
    [activeList, bootstrap],
  );

  const upload = useCallback(async (file: File) => {
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
        data: {
          id: string;
          status: BatchStatus;
          instagramUsername: string;
          totalItems: number;
          skippedExisting: number;
          batches?: { id: string; instagramUsername: string; totalItems: number }[];
        };
      }>("/admin/crawl-reviews/upload", { method: "POST", body });
      await loadBootstrap(false);
      setActiveList(
        response.data.status === "REVIEWING" ? "REVIEWING" : "REVIEWED",
      );
      setSelectedBatchId(response.data.id);
      setPage(1);
      const accountCount = response.data.batches?.length ?? 1;
      const accountLabel = accountCount > 1
        ? `${accountCount.toLocaleString("fa-IR")} حساب اینستاگرام، به‌صورت جداگانه،`
        : `@${response.data.instagramUsername}`;
      setFeedback({
        tone: "success",
        text:
          response.data.totalItems > 0
            ? `${response.data.totalItems.toLocaleString("fa-IR")} محتوای تازه برای ${accountLabel} وارد صف بررسی شد.${response.data.skippedExisting ? ` ${response.data.skippedExisting.toLocaleString("fa-IR")} محتوای قبلی تکرار نشد.` : ""}`
            : "محتوای تازه‌ای پیدا نشد؛ موارد قبلی دوباره وارد صف نشدند.",
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
  }, [loadBootstrap]);

  useEffect(() => {
    if (
      !workerJob ||
      workerJob.status !== "SUCCEEDED" ||
      importedWorkerJobs.current.has(workerJob.id)
    ) {
      return;
    }
    importedWorkerJobs.current.add(workerJob.id);
    if (workerJob.kind === "PROCESS") {
      window.localStorage.removeItem(LOCAL_JOB_STORAGE_KEY);
      window.setTimeout(() => {
        void Promise.all([
          loadBootstrap(false),
          selectedBatchId
            ? loadBatch(selectedBatchId, page)
            : Promise.resolve(),
        ]);
        setFeedback({
          tone: "success",
          text: "دانلود، انتقال رسانه‌ها و ورود اطلاعات به سایت کامل شد.",
        });
      }, 0);
      return;
    }
    if (!workerJob.hasResult) return;
    void (async () => {
      try {
        const payload = await localWorkerApi<unknown[]>(
          `/jobs/${encodeURIComponent(workerJob.id)}/result`,
        );
        const file = new File(
          [JSON.stringify(payload)],
          `${workerJob.username}.json`,
          { type: "application/json" },
        );
        await upload(file);
        window.localStorage.removeItem(LOCAL_JOB_STORAGE_KEY);
      } catch (caught) {
        importedWorkerJobs.current.delete(workerJob.id);
        setFeedback({
          tone: "error",
          text:
            caught instanceof Error
              ? caught.message
              : "ورود نتیجه کرال به صف بررسی انجام نشد.",
        });
      }
    })();
  }, [loadBatch, loadBootstrap, page, selectedBatchId, upload, workerJob]);

  async function startCrawl() {
    const username = selectedInstagram.trim().replace(/^@/, "").toLowerCase();
    const person = bootstrap?.notablePeople.find(
      (item) => item.instagramHandle.toLowerCase() === username,
    );
    if (!person) {
      setFeedback({
        tone: "error",
        text: "ابتدا یکی از چهره‌های دارای آیدی اینستاگرام را انتخاب کنید.",
      });
      return;
    }
    if (!person.instagramCrawlRequest) {
      setFeedback({
        tone: "error",
        text: "برای این چهره درخواست کرال ثبت نشده است؛ از مدیر بخواهید cURL تازه را در ویرایش چهره ثبت کند.",
      });
      return;
    }
    if (!workerReady) {
      setFeedback({
        tone: "error",
        text:
          workerVersion !== null && workerVersion < 2
            ? "نسخه برنامه کرالر قدیمی است؛ نسخه تازه را از همین صفحه دانلود و جایگزین کنید."
            : workerEnvironment &&
          workerEnvironment !== expectedWorkerEnvironment()
            ? "برنامه کرالر برای محیط دیگری اجرا شده است؛ دستور همین صفحه را اجرا کنید."
            : "برنامه کرالر روی این لپ‌تاپ اجرا نیست.",
      });
      return;
    }
    setBusyAction(true);
    setFeedback(null);
    try {
      const response = await localWorkerApi<{ data: WorkerJob }>("/crawl", {
        method: "POST",
        body: JSON.stringify({
          username: person.instagramHandle,
          browser: selectedBrowser,
          crawlRequest: person.instagramCrawlRequest,
        }),
      });
      setWorkerJob(response.data);
      storeWorkerJob(response.data);
    } catch (caught) {
      setFeedback({
        tone: "error",
        text:
          caught instanceof Error ? caught.message : "شروع کرال انجام نشد.",
      });
    } finally {
      setBusyAction(false);
    }
  }

  async function pauseWorkerJob() {
    if (!workerJob) return;
    try {
      const response = await localWorkerApi<{ data: WorkerJob }>(
        `/jobs/${encodeURIComponent(workerJob.id)}/pause`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setWorkerJob(response.data);
    } catch (caught) {
      setFeedback({
        tone: "error",
        text:
          caught instanceof Error ? caught.message : "توقف امن انجام نشد.",
      });
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
    if (!workerReady) {
      setFeedback({
        tone: "error",
        text: "برای دانلود با نشست Chrome، ابتدا برنامه کرالر این لپ‌تاپ را اجرا کنید.",
      });
      return;
    }
    setBusyAction(true);
    setFeedback(null);
    let ticketCreated = false;
    try {
      const ticketResponse = await browserApi<{
        data: { token: string };
      }>(`/admin/crawl-reviews/${batch.id}/local-ticket`, {
        method: "POST",
      });
      ticketCreated = true;
      const workerResponse = await localWorkerApi<{ data: WorkerJob }>(
        "/process",
        {
          method: "POST",
          body: JSON.stringify({
            batchId: batch.id,
            ticket: ticketResponse.data.token,
            browser: selectedBrowser,
          }),
        },
      );
      setWorkerJob(workerResponse.data);
      storeWorkerJob(workerResponse.data);
      await refreshCurrent();
      setFeedback({
        tone: "success",
        text: "دانلود با نشست اینستاگرام همین لپ‌تاپ شروع شد.",
      });
    } catch (caught) {
      if (ticketCreated) {
        await browserApi(`/admin/crawl-reviews/${batch.id}/local-reset`, {
          method: "POST",
        }).catch(() => undefined);
      }
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
          <span className="section-eyebrow">کرال داده</span>
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
            <h1>کرال داده</h1>
            <p>
              چهره را انتخاب کنید؛ کرال با اینستاگرام همین لپ‌تاپ انجام و نتیجه
              مستقیماً وارد صف بررسی می‌شود.
            </p>
          </div>
          <div className="catalog-heading-actions">
            <Link href="/admin/catalog">مدیریت داده‌ها</Link>
            <Link href="/admin/moderation">بررسی محتوای کاربران</Link>
          </div>
        </header>

        <section className="crawl-worker-panel">
          <header>
            <div>
              <span
                className={`crawl-worker-dot${workerReady ? " is-online" : ""}`}
              />
              <strong>
                {workerReady
                  ? "اتصال لپ‌تاپ برقرار است"
                  : workerOutdated
                    ? "نسخهٔ برنامهٔ کرالر قدیمی است"
                    : workerInWrongEnvironment
                      ? "برنامهٔ کرالر به سایت دیگری متصل است"
                      : "اتصال لپ‌تاپ برقرار نیست"}
              </strong>
            </div>
            <small>
              نشست اینستاگرام فقط روی همین دستگاه استفاده می‌شود و به سرور
              فرستاده نمی‌شود.
            </small>
          </header>
          {!workerReady ? (
            <div className="crawl-worker-command">
              <span>
                {workerOutdated
                  ? "برنامهٔ قدیمی را کامل ببندید، نسخهٔ جدید را دانلود و از فایل فشرده خارج کنید، سپس همان نسخه را باز کنید."
                  : workerInWrongEnvironment
                    ? "برنامهٔ کرالر را در حالت سایت اصلی باز کنید."
                    : "دستیار هتل‌یاب را یک‌بار نصب و باز کنید؛ به ترمینال یا پوشه پروژه نیازی نیست."}
              </span>
              {user.role === "ADMIN" || user.role === "MODERATOR" ? (
                <div className="crawl-worker-downloads">
                  <a
                    className="button"
                    href={`${BROWSER_API_BASE_URL}/admin/crawl-helper-downloads/macos-arm64`}
                  >
                    دانلود برای مک جدید (Silicon)
                  </a>
                  <a
                    className="button"
                    href={`${BROWSER_API_BASE_URL}/admin/crawl-helper-downloads/macos-x64`}
                  >
                    دانلود برای مک اینتل
                  </a>
                  <a
                    className="button"
                    href={`${BROWSER_API_BASE_URL}/admin/crawl-helper-downloads/windows-x64`}
                  >
                    دانلود برای ویندوز
                  </a>
                </div>
              ) : null}
              <small>
                بعد از بازکردن برنامه، وضعیت همین بخش سبز می‌شود و می‌توانید کرال
                را با دکمه شروع کنید. برنامه را هنگام کار باز نگه دارید.
              </small>
              <button
                className="button button-secondary button-small"
                type="button"
                onClick={() => void checkWorker()}
              >
                بررسی دوباره اتصال
              </button>
            </div>
          ) : null}
          <div className="crawl-worker-controls">
            <label>
              چهره
              <input
                type="search"
                dir="ltr"
                list="crawl-review-people"
                value={selectedInstagram}
                placeholder="انتخاب آیدی اینستاگرام"
                onChange={(event) => setSelectedInstagram(event.target.value)}
              />
              <datalist id="crawl-review-people">
                {(bootstrap?.notablePeople ?? []).map((person) => (
                  <option
                    key={person.id}
                    value={person.instagramHandle}
                    label={person.displayName}
                  />
                ))}
              </datalist>
            </label>
            <label>
              مرورگر اینستاگرام
              <select
                value={selectedBrowser}
                onChange={(event) => setSelectedBrowser(event.target.value)}
              >
                <option value="chrome">Chrome</option>
                <option value="safari">Safari</option>
                <option value="firefox">Firefox</option>
                <option value="brave">Brave</option>
                <option value="edge">Edge</option>
              </select>
            </label>
            <button
              className="button"
              type="button"
              disabled={busyAction || !workerReady || workerJob?.status === "RUNNING"}
              onClick={() => void startCrawl()}
            >
              {workerJob?.kind === "CRAWL" && workerJob.status === "PAUSED"
                ? "ادامه کرال"
                : "شروع کرال"}
            </button>
          </div>
          {workerJob ? (
            <div
              className={`crawl-worker-job crawl-worker-job-${workerJob.status.toLowerCase()}`}
            >
              <div>
                <strong>{workerJob.message}</strong>
                <small>
                  {workerJob.current.toLocaleString("fa-IR")} مورد بررسی شد
                  {workerJob.newItems
                    ? ` · ${workerJob.newItems.toLocaleString("fa-IR")} محتوای تازه`
                    : ""}
                </small>
              </div>
              {workerJob.total ? (
                <progress value={workerJob.current} max={workerJob.total} />
              ) : null}
              {workerJob.status === "RUNNING" ? (
                <button
                  className="button button-secondary button-small"
                  type="button"
                  onClick={() => void pauseWorkerJob()}
                >
                  توقف امن
                </button>
              ) : null}
              {workerJob.logs.length ? (
                <details>
                  <summary>جزئیات اجرا</summary>
                  <pre dir="ltr">{workerJob.logs.join("\n")}</pre>
                </details>
              ) : null}
            </div>
          ) : null}
        </section>

        <details className="crawl-review-manual-upload">
          <summary>بارگذاری دستی خروجی JSON</summary>
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
                  : "افزودن خروجی قدیمی کرالر"}
              </strong>
              <small>فایل JSON را اینجا رها کنید یا از دستگاه انتخاب کنید.</small>
              <small>فایل چندحسابی هم پذیرفته می‌شود؛ ردیف‌های هر حساب جداگانه برای بررسی قرار می‌گیرند.</small>
            </span>
          </button>
        </details>
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
      <div className="crawl-review-item-main">
        {item.preview?.mediaUrl || item.preview?.thumbnailUrl ? (
          <div className="crawl-review-preview">
          {item.preview.mediaType === "VIDEO" && item.preview.mediaUrl ? (
            <video
              controls
              playsInline
              preload="metadata"
              poster={item.preview.thumbnailUrl ?? undefined}
              src={item.preview.mediaUrl}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.preview.thumbnailUrl ?? item.preview.mediaUrl ?? ""}
              alt={`پیش‌نمایش محتوای ${item.shortcode}`}
            />
          )}
          {item.preview.itemCount > 1 ? (
            <span>{item.preview.itemCount.toLocaleString("fa-IR")} بخش</span>
          ) : null}
          </div>
        ) : null}
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
