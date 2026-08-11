"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { browserApi } from "@/lib/browser-api";
import type { Destination, TravelVideo } from "@/lib/types";

type CatalogData = {
  destinations: Destination[];
  hotels: Array<{ id: string; slug: string; name: string; city: string; publicationStatus: string }>;
  notablePeople: Array<{ id: string; slug: string; displayName: string; instagramHandle: string | null; primaryCategory: string; publicationStatus: string }>;
  videos: TravelVideo[];
};

type CatalogSection = "destinations" | "hotels" | "people" | "videos";

const sections: Array<{ value: CatalogSection; label: string }> = [
  { value: "destinations", label: "مقصد" },
  { value: "hotels", label: "هتل" },
  { value: "people", label: "چهره" },
  { value: "videos", label: "ویدیو" },
];

export default function CatalogAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState<CatalogSection>("destinations");
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const result = await browserApi<{ data: CatalogData }>("/admin/catalog/bootstrap");
      setCatalog(result.data);
    } catch {
      setFeedback({ tone: "error", text: "دریافت اطلاعات کاتالوگ انجام نشد." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (user?.role === "ADMIN") void loadCatalog();
      else if (!authLoading) setLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [authLoading, loadCatalog, user]);

  async function submit(endpoint: string, payload: Record<string, unknown>, form: HTMLFormElement) {
    setSubmitting(true);
    setFeedback(null);
    try {
      await browserApi(`/admin/catalog/${endpoint}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      form.reset();
      setFeedback({ tone: "success", text: "اطلاعات با موفقیت در PostgreSQL ثبت شد." });
      await loadCatalog();
    } catch (caught) {
      setFeedback({
        tone: "error",
        text: caught instanceof Error ? caught.message : "ثبت اطلاعات انجام نشد.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadExport() {
    setFeedback(null);
    try {
      const data = await browserApi<Record<string, unknown>>("/admin/catalog/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `hotel-yab-import-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(href);
    } catch {
      setFeedback({ tone: "error", text: "ساخت فایل خروجی انجام نشد." });
    }
  }

  if (authLoading || loading) {
    return <main className="section container admin-page"><p>در حال دریافت پنل مدیریت…</p></main>;
  }
  if (!user || user.role !== "ADMIN") {
    return (
      <main className="section container admin-page">
        <section className="admin-empty">
          <span className="section-eyebrow">مدیریت داده‌ها</span>
          <h1>دسترسی مدیر لازم است</h1>
          <p>افزودن داده‌های اصلی سایت فقط برای مدیر امکان‌پذیر است.</p>
          <Link className="button" href="/">بازگشت به سایت</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="section container admin-page catalog-admin-page">
      <header className="admin-heading catalog-admin-heading">
        <div>
          <span className="section-eyebrow">مدیریت داده‌های اصلی</span>
          <h1>کاتالوگ هتل‌یاب</h1>
          <p>مقصد، هتل، چهره و ویدیو را بدون ویرایش دستی JSON ثبت کنید.</p>
        </div>
        <div className="catalog-heading-actions">
          <Link href="/admin/moderation">صف بررسی دیدگاه‌ها</Link>
          <button className="button button-secondary" type="button" onClick={() => void downloadExport()}>
            دریافت خروجی JSON
          </button>
        </div>
      </header>

      <nav className="catalog-tabs" aria-label="بخش‌های مدیریت داده">
        {sections.map((section) => (
          <button
            type="button"
            key={section.value}
            className={activeSection === section.value ? "is-active" : ""}
            onClick={() => { setActiveSection(section.value); setFeedback(null); }}
          >
            افزودن {section.label}
          </button>
        ))}
      </nav>

      {feedback ? (
        <p className={`form-feedback form-feedback-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>
          {feedback.text}
        </p>
      ) : null}

      <section className="catalog-editor">
        <div className="catalog-form-card">
          {activeSection === "destinations" ? <DestinationForm catalog={catalog} disabled={submitting} onSubmit={submit} /> : null}
          {activeSection === "hotels" ? <HotelForm disabled={submitting} onSubmit={submit} /> : null}
          {activeSection === "people" ? <PersonForm disabled={submitting} onSubmit={submit} /> : null}
          {activeSection === "videos" ? <VideoForm catalog={catalog} disabled={submitting} onSubmit={submit} /> : null}
        </div>
        <CatalogSummary section={activeSection} catalog={catalog} />
      </section>
    </main>
  );
}

type SubmitHandler = (endpoint: string, payload: Record<string, unknown>, form: HTMLFormElement) => Promise<void>;

function DestinationForm({ catalog, disabled, onSubmit }: { catalog: CatalogData | null; disabled: boolean; onSubmit: SubmitHandler }) {
  const [type, setType] = useState<"CITY" | "PROVINCE">("CITY");
  return (
    <CatalogForm title="مقصد جدید" description="تصویر باید از /images/cities یا /images/provinces خوانده شود." disabled={disabled} onSubmit={(event, data) => onSubmit("destinations", {
      type,
      slug: text(data, "slug"), name: text(data, "name"), description: optional(data, "description"),
      imageUrl: optional(data, "imageUrl"), parentProvinceId: type === "CITY" ? optional(data, "parentProvinceId") : null,
      isFeatured: data.get("isFeatured") === "on", displayOrder: optionalNumber(data, "displayOrder"),
      primarySourceUrl: optional(data, "primarySourceUrl"), sourceType: optional(data, "sourceType"), notes: optional(data, "notes"),
      publicationStatus: text(data, "publicationStatus"),
    }, event.currentTarget)}>
      <label>نوع مقصد<select name="type" value={type} onChange={(event) => setType(event.target.value as "CITY" | "PROVINCE")}><option value="CITY">شهر</option><option value="PROVINCE">استان</option></select></label>
      <label>نام<input name="name" required placeholder="مثلاً مشهد" /></label>
      <label>Slug<input name="slug" dir="ltr" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="mashhad" /></label>
      {type === "CITY" ? <label>استان والد<select name="parentProvinceId" required defaultValue=""><option value="" disabled>انتخاب استان</option>{catalog?.destinations.filter((item) => item.type === "PROVINCE").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label> : null}
      <label className="catalog-field-wide">توضیحات<textarea name="description" rows={3} /></label>
      <label className="catalog-field-wide">مسیر تصویر<input name="imageUrl" dir="ltr" placeholder={type === "CITY" ? "/images/cities/slug.webp" : "/images/provinces/slug.webp"} /></label>
      <label>ترتیب نمایش<input name="displayOrder" type="number" min="1" /></label>
      <label>نوع منبع<input name="sourceType" dir="ltr" placeholder="WIKIPEDIA" /></label>
      <label className="catalog-field-wide">لینک منبع<input name="primarySourceUrl" dir="ltr" type="url" /></label>
      <label className="catalog-field-wide">یادداشت داخلی<textarea name="notes" rows={2} /></label>
      <label>وضعیت انتشار<PublicationSelect /></label>
      <label className="catalog-checkbox"><input name="isFeatured" type="checkbox" /> مقصد منتخب باشد</label>
    </CatalogForm>
  );
}

function HotelForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: SubmitHandler }) {
  return (
    <CatalogForm title="هتل جدید" description="فیلدها با مدل فعلی Hotel و فایل Import سازگارند." disabled={disabled} onSubmit={(event, data) => onSubmit("hotels", {
      slug: text(data, "slug"), name: text(data, "name"), description: optional(data, "description"), countryCode: text(data, "countryCode").toUpperCase(), city: text(data, "city"),
      address: optional(data, "address"), latitude: optionalNumber(data, "latitude"), longitude: optionalNumber(data, "longitude"), websiteUrl: optional(data, "websiteUrl"),
      imageUrl: optional(data, "imageUrl"), logoUrl: optional(data, "logoUrl"), starRating: optionalNumber(data, "starRating"), publicationStatus: text(data, "publicationStatus"),
    }, event.currentTarget)}>
      <label>نام هتل<input name="name" required /></label><label>Slug<input name="slug" dir="ltr" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
      <label>شهر<input name="city" required /></label><label>کد کشور<input name="countryCode" dir="ltr" defaultValue="IR" required maxLength={2} /></label>
      <label>ستاره رسمی<select name="starRating" defaultValue=""><option value="">نامشخص</option>{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label><label>وضعیت انتشار<PublicationSelect /></label>
      <label className="catalog-field-wide">توضیحات<textarea name="description" rows={3} /></label><label className="catalog-field-wide">آدرس<input name="address" /></label>
      <label>عرض جغرافیایی<input name="latitude" dir="ltr" type="number" step="any" /></label><label>طول جغرافیایی<input name="longitude" dir="ltr" type="number" step="any" /></label>
      <label className="catalog-field-wide">وب‌سایت یا صفحه رسمی<input name="websiteUrl" dir="ltr" type="url" /></label>
      <label className="catalog-field-wide">مسیر عکس<input name="imageUrl" dir="ltr" placeholder="/images/hotels/slug.webp" /></label>
      <label className="catalog-field-wide">مسیر لوگو<input name="logoUrl" dir="ltr" placeholder="/images/hotels/slug-logo.webp" /></label>
    </CatalogForm>
  );
}

function PersonForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: SubmitHandler }) {
  return (
    <CatalogForm title="چهره جدید" description="آیدی اینستاگرام بدون @ ذخیره می‌شود و برای اتصال ویدیوها استفاده خواهد شد." disabled={disabled} onSubmit={(event, data) => onSubmit("notable-people", {
      slug: text(data, "slug"), displayName: text(data, "displayName"), instagramHandle: optional(data, "instagramHandle"), primaryCategory: text(data, "primaryCategory"),
      occupation: optional(data, "occupation"), followerCount: optionalNumber(data, "followerCount"), biography: optional(data, "biography"), countryCode: optional(data, "countryCode")?.toUpperCase() ?? null,
      imageUrl: optional(data, "imageUrl"), publicationStatus: text(data, "publicationStatus"),
    }, event.currentTarget)}>
      <label>نام نمایشی<input name="displayName" required /></label><label>Slug<input name="slug" dir="ltr" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
      <label>آیدی اینستاگرام<input name="instagramHandle" dir="ltr" pattern="[A-Za-z0-9._]+" /></label>
      <label>دسته‌بندی<select name="primaryCategory" defaultValue="INFLUENCER"><option value="ACTOR">بازیگر</option><option value="ATHLETE">ورزشکار</option><option value="INFLUENCER">اینفلوئنسر</option><option value="MUSICIAN">موسیقی</option><option value="PUBLIC_FIGURE">چهره عمومی</option></select></label>
      <label>عنوان فعالیت<input name="occupation" /></label><label>تعداد دنبال‌کننده<input name="followerCount" type="number" min="0" dir="ltr" /></label>
      <label>کد کشور<input name="countryCode" defaultValue="IR" maxLength={2} dir="ltr" /></label><label>وضعیت انتشار<PublicationSelect /></label>
      <label className="catalog-field-wide">مسیر عکس<input name="imageUrl" dir="ltr" placeholder="/images/people/slug.webp" /></label>
      <label className="catalog-field-wide">زندگی‌نامه<textarea name="biography" rows={4} /></label>
    </CatalogForm>
  );
}

function VideoForm({ catalog, disabled, onSubmit }: { catalog: CatalogData | null; disabled: boolean; onSubmit: SubmitHandler }) {
  return (
    <CatalogForm title="ویدیوی جدید" description="یک ویدیو می‌تواند به چند مقصد و چند هتل متصل شود؛ لینک پست اصلی همیشه نگه داشته می‌شود." disabled={disabled} onSubmit={(event, data) => onSubmit("videos", {
      id: text(data, "id"), instagramUsername: text(data, "instagramUsername"), platform: text(data, "platform"), personCategory: optional(data, "personCategory"), contentType: text(data, "contentType"),
      sourceUrl: text(data, "sourceUrl"), title: text(data, "title"), placeName: text(data, "placeName"), placeType: text(data, "placeType"), publishedDate: optional(data, "publishedDate"),
      captionSummary: optional(data, "captionSummary"), evidenceType: text(data, "evidenceType"), verificationStatus: text(data, "verificationStatus"), notes: optional(data, "notes"),
      mediaUrl: text(data, "mediaUrl"), thumbnailUrl: text(data, "thumbnailUrl"), publicationStatus: text(data, "publicationStatus"), destinationIds: data.getAll("destinationIds").map(String), hotelIds: data.getAll("hotelIds").map(String),
    }, event.currentTarget)}>
      <label>شناسه ویدیو<input name="id" dir="ltr" required placeholder="username-001" /></label>
      <label>سازنده<select name="instagramUsername" required defaultValue=""><option value="" disabled>انتخاب چهره</option>{catalog?.notablePeople.filter((person) => person.instagramHandle).map((person) => <option value={person.instagramHandle ?? ""} key={person.id}>{person.displayName} · @{person.instagramHandle}</option>)}</select></label>
      <label>عنوان<input name="title" required /></label><label>نام مکان<input name="placeName" required /></label>
      <label>پلتفرم<input name="platform" dir="ltr" defaultValue="INSTAGRAM" required /></label><label>نوع محتوا<input name="contentType" dir="ltr" defaultValue="POST" required /></label>
      <label>نوع مکان<input name="placeType" dir="ltr" defaultValue="CULTURAL" required /></label><label>دسته سازنده<input name="personCategory" dir="ltr" defaultValue="INFLUENCER" /></label>
      <label>تاریخ انتشار<input name="publishedDate" dir="ltr" placeholder="1404/8/22" /></label><label>وضعیت بررسی<select name="verificationStatus" defaultValue="VERIFIED"><option value="PENDING">در انتظار</option><option value="VERIFIED">تأییدشده</option><option value="REJECTED">ردشده</option></select></label>
      <label className="catalog-field-wide">لینک پست اصلی<input name="sourceUrl" type="url" dir="ltr" required /></label>
      <label className="catalog-field-wide">مسیر ویدیو<input name="mediaUrl" dir="ltr" required placeholder="/travel-videos/username/001.mp4" /></label>
      <label className="catalog-field-wide">مسیر کاور<input name="thumbnailUrl" dir="ltr" required placeholder="/travel-videos/username/001-thumbnail.webp" /></label>
      <label className="catalog-field-wide">مقصدها<select name="destinationIds" multiple required size={Math.min(8, Math.max(4, catalog?.destinations.length ?? 4))}>{catalog?.destinations.map((item) => <option value={item.id} key={item.id}>{item.type === "CITY" ? "شهر" : "استان"} {item.name}</option>)}</select><small>برای انتخاب چند مورد در مک Command و در ویندوز Ctrl را نگه دارید.</small></label>
      <label className="catalog-field-wide">هتل‌های مرتبط (اختیاری)<select name="hotelIds" multiple size={Math.min(6, Math.max(3, catalog?.hotels.length ?? 3))}>{catalog?.hotels.map((hotel) => <option value={hotel.id} key={hotel.id}>{hotel.name} · {hotel.city}</option>)}</select></label>
      <label className="catalog-field-wide">خلاصه کپشن<textarea name="captionSummary" rows={3} /></label>
      <label>نوع مدرک<input name="evidenceType" dir="ltr" defaultValue="ORIGINAL_POST" required /></label><label>وضعیت انتشار<PublicationSelect /></label>
      <label className="catalog-field-wide">یادداشت داخلی<textarea name="notes" rows={2} /></label>
    </CatalogForm>
  );
}

function CatalogForm({ title, description, disabled, onSubmit, children }: { title: string; description: string; disabled: boolean; onSubmit: (event: FormEvent<HTMLFormElement>, data: FormData) => void; children: React.ReactNode }) {
  return (
    <form className="catalog-form" onSubmit={(event) => { event.preventDefault(); onSubmit(event, new FormData(event.currentTarget)); }}>
      <div className="catalog-form-heading"><h2>{title}</h2><p>{description}</p></div>
      <fieldset disabled={disabled}><div className="catalog-form-grid">{children}</div><button className="button catalog-submit" type="submit">{disabled ? "در حال ثبت…" : "ثبت در دیتابیس"}</button></fieldset>
    </form>
  );
}

function PublicationSelect() { return <select name="publicationStatus" defaultValue="PUBLISHED"><option value="PUBLISHED">منتشرشده</option><option value="DRAFT">پیش‌نویس</option><option value="ARCHIVED">آرشیوشده</option></select>; }

function CatalogSummary({ section, catalog }: { section: CatalogSection; catalog: CatalogData | null }) {
  const items = section === "destinations" ? catalog?.destinations.map((item) => `${item.type === "CITY" ? "شهر" : "استان"} ${item.name}`) : section === "hotels" ? catalog?.hotels.map((item) => item.name) : section === "people" ? catalog?.notablePeople.map((item) => item.displayName) : catalog?.videos.map((item) => item.title ?? item.id);
  return <aside className="catalog-summary"><span className="section-eyebrow">داده‌های موجود</span><h2>{(items?.length ?? 0).toLocaleString("fa-IR")} مورد</h2><div>{items?.slice(0, 12).map((item) => <span key={item}>{item}</span>)}</div>{(items?.length ?? 0) > 12 ? <small>و {(items!.length - 12).toLocaleString("fa-IR")} مورد دیگر</small> : null}</aside>;
}

function text(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function optional(data: FormData, key: string) { const value = text(data, key); return value || null; }
function optionalNumber(data: FormData, key: string) { const value = text(data, key); return value ? Number(value) : undefined; }
