"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { browserApi } from "@/lib/browser-api";
import type { Destination, TravelVideo } from "@/lib/types";

type CatalogData = {
  destinations: Destination[];
  hotels: CatalogHotel[];
  notablePeople: CatalogPerson[];
  videos: TravelVideo[];
};

type CatalogHotel = {
  id: string; slug: string; name: string; description: string | null;
  countryCode: string; city: string; address: string | null;
  websiteUrl: string | null; imageUrl: string | null; logoUrl: string | null;
  starRating: number | null; publicationStatus: string;
};

type CatalogPerson = {
  id: string; slug: string; displayName: string; instagramHandle: string | null;
  primaryCategory: string; occupation: string | null; followerCount: number | null;
  biography: string | null; countryCode: string | null; imageUrl: string | null;
  publicationStatus: string;
};

type CatalogSection = "destinations" | "hotels" | "people" | "videos";
type CatalogMode = "create" | "edit";

const sections: Array<{ value: CatalogSection; label: string }> = [
  { value: "destinations", label: "مقصد" },
  { value: "hotels", label: "هتل" },
  { value: "people", label: "چهره" },
  { value: "videos", label: "ویدیو" },
];

const editSearchCopy: Record<CatalogSection, { label: string; placeholder: string; empty: string; noResults: string; selectedAriaLabel: string }> = {
  destinations: { label: "انتخاب مقصد برای ویرایش", placeholder: "جست‌وجوی نام یا شناسه مقصد", empty: "هنوز مقصدی انتخاب نشده است.", noResults: "مقصدی پیدا نشد.", selectedAriaLabel: "مقصد انتخاب‌شده" },
  hotels: { label: "انتخاب هتل برای ویرایش", placeholder: "جست‌وجوی نام یا شناسه هتل", empty: "هنوز هتلی انتخاب نشده است.", noResults: "هتلی پیدا نشد.", selectedAriaLabel: "هتل انتخاب‌شده" },
  people: { label: "انتخاب چهره برای ویرایش", placeholder: "جست‌وجوی نام یا شناسه چهره", empty: "هنوز چهره‌ای انتخاب نشده است.", noResults: "چهره‌ای پیدا نشد.", selectedAriaLabel: "چهره انتخاب‌شده" },
  videos: { label: "انتخاب ویدیو برای حذف", placeholder: "جست‌وجوی عنوان یا شناسه ویدیو", empty: "هنوز ویدیویی انتخاب نشده است.", noResults: "ویدیویی پیدا نشد.", selectedAriaLabel: "ویدیوی انتخاب‌شده" },
};

export default function CatalogAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState<CatalogSection>("destinations");
  const [mode, setMode] = useState<CatalogMode>("create");
  const [selectedEditId, setSelectedEditId] = useState("");
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

  async function submit(endpoint: string, payload: Record<string, unknown>, form: HTMLFormElement, method: "POST" | "PATCH" = "POST") {
    setSubmitting(true);
    setFeedback(null);
    try {
      await browserApi(`/admin/catalog/${endpoint}`, {
        method,
        body: JSON.stringify(payload),
      });
      if (method === "POST") form.reset();
      setFeedback({ tone: "success", text: method === "POST" ? "اطلاعات با موفقیت در PostgreSQL ثبت شد." : "تغییرات با موفقیت ذخیره شد." });
      await loadCatalog();
      return true;
    } catch (caught) {
      setFeedback({
        tone: "error",
        text: caught instanceof Error ? caught.message : "ثبت اطلاعات انجام نشد.",
      });
      return false;
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

  async function deleteSelected() {
    if (!selectedEditId) return;
    const selectedLabel = editItems?.find((item) => item.id === selectedEditId)?.label ?? "این مورد";
    if (!window.confirm(`«${selectedLabel}» برای همیشه حذف شود؟ ارتباط‌ها و محتوای وابسته نیز ممکن است حذف شوند.`)) return;
    const endpoint = activeSection === "people" ? "notable-people" : activeSection;
    setSubmitting(true);
    setFeedback(null);
    try {
      await browserApi(`/admin/catalog/${endpoint}/${encodeURIComponent(selectedEditId)}`, { method: "DELETE" });
      setSelectedEditId("");
      setFeedback({ tone: "success", text: "داده انتخاب‌شده حذف شد." });
      await loadCatalog();
    } catch (caught) {
      setFeedback({ tone: "error", text: caught instanceof Error ? caught.message : "حذف داده انجام نشد." });
    } finally {
      setSubmitting(false);
    }
  }

  const editItems = activeSection === "destinations"
    ? catalog?.destinations.map((item) => ({ id: item.id, value: item.id, label: `${item.type === "CITY" ? "شهر" : "استان"} ${item.name}` }))
    : activeSection === "hotels"
      ? catalog?.hotels.map((item) => ({ id: item.id, value: item.id, label: `${item.name} · ${item.city}` }))
      : activeSection === "people"
        ? catalog?.notablePeople.map((item) => ({ id: item.id, value: item.id, label: `${item.displayName}${item.instagramHandle ? ` · @${item.instagramHandle}` : ""}` }))
        : catalog?.videos.map((item) => ({ id: item.id, value: item.id, label: item.title || item.id }));
  const selectedDestination = catalog?.destinations.find((item) => item.id === selectedEditId);
  const selectedHotel = catalog?.hotels.find((item) => item.id === selectedEditId);
  const selectedPerson = catalog?.notablePeople.find((item) => item.id === selectedEditId);

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
        <button type="button" className={mode === "create" ? "is-active" : ""} onClick={() => { setMode("create"); setSelectedEditId(""); setFeedback(null); }}>ثبت داده جدید</button>
        <button type="button" className={mode === "edit" ? "is-active" : ""} onClick={() => { setMode("edit"); setSelectedEditId(""); setFeedback(null); }}>ویرایش داده‌های موجود</button>
      </nav>

      <nav className="catalog-tabs catalog-entity-tabs" aria-label="نوع داده">
        {sections.map((section) => (
          <button
            type="button"
            key={section.value}
            className={activeSection === section.value ? "is-active" : ""}
            onClick={() => { setActiveSection(section.value); setSelectedEditId(""); setFeedback(null); }}
          >
            {section.label}
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
          {mode === "edit" ? <SearchableSingleSelect label={editSearchCopy[activeSection].label} searchPlaceholder={editSearchCopy[activeSection].placeholder} emptyText={editSearchCopy[activeSection].empty} noResultsText={editSearchCopy[activeSection].noResults} selectedAriaLabel={editSearchCopy[activeSection].selectedAriaLabel} items={editItems ?? []} selectedValue={selectedEditId} error={null} onChange={setSelectedEditId} /> : null}
          {mode === "edit" && activeSection === "videos" && selectedEditId ? <div className="catalog-edit-empty"><h2>ویدیوی انتخاب‌شده</h2><p>ویرایش روابط ویدیو فعلاً غیرفعال است، اما می‌توانید ویدیو را حذف کنید.</p></div> : null}
          {mode === "edit" && !selectedEditId ? <div className="catalog-edit-empty"><p>ابتدا یکی از داده‌های موجود را جست‌وجو و انتخاب کنید.</p></div> : null}
          {activeSection === "destinations" && (mode === "create" || selectedDestination) ? <DestinationForm key={selectedEditId || "new-destination"} catalog={catalog} disabled={submitting} onSubmit={submit} mode={mode} initial={selectedDestination} /> : null}
          {activeSection === "hotels" && (mode === "create" || selectedHotel) ? <HotelForm key={selectedEditId || "new-hotel"} disabled={submitting} onSubmit={submit} mode={mode} initial={selectedHotel} /> : null}
          {activeSection === "people" && (mode === "create" || selectedPerson) ? <PersonForm key={selectedEditId || "new-person"} disabled={submitting} onSubmit={submit} mode={mode} initial={selectedPerson} /> : null}
          {activeSection === "videos" && mode === "create" ? <VideoForm catalog={catalog} disabled={submitting} onSubmit={submit} /> : null}
          {mode === "edit" && selectedEditId ? <button className="catalog-delete" type="button" disabled={submitting} onClick={() => void deleteSelected()}>{submitting ? "در حال حذف…" : "حذف دائمی این مورد"}</button> : null}
        </div>
        <CatalogSummary section={activeSection} catalog={catalog} />
      </section>
    </main>
  );
}

type SubmitHandler = (endpoint: string, payload: Record<string, unknown>, form: HTMLFormElement, method?: "POST" | "PATCH") => Promise<boolean>;

function DestinationForm({ catalog, disabled, onSubmit, mode, initial }: { catalog: CatalogData | null; disabled: boolean; onSubmit: SubmitHandler; mode: CatalogMode; initial?: Destination }) {
  const [type, setType] = useState<"CITY" | "PROVINCE">(initial?.type ?? "CITY");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [imageUrlOverride, setImageUrlOverride] = useState<string | null>(initial?.imageUrl ?? null);
  const initialPeerCount = (catalog?.destinations ?? []).filter((item) => item.type === (initial?.type ?? "CITY") && item.id !== initial?.id).length;
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? initialPeerCount + 1);
  const endpoint = mode === "edit" && initial ? `destinations/${initial.id}` : "destinations";
  const suggestedImageUrl = slug ? `/images/${type === "CITY" ? "cities" : "provinces"}/${slug}.webp` : "";
  const imageUrl = imageUrlOverride ?? suggestedImageUrl;
  const orderedPeers = (catalog?.destinations ?? [])
    .filter((item) => item.type === type && item.id !== initial?.id)
    .sort((left, right) => (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER) || left.name.localeCompare(right.name, "fa"));
  const maxPosition = orderedPeers.length + 1;
  const selectedPosition = Math.min(displayOrder, maxPosition);
  const orderPreview = orderedPeers.map((item) => ({ id: item.id, name: item.name }));
  orderPreview.splice(selectedPosition - 1, 0, { id: "__selected__", name: initial?.name ?? "مقصد جدید" });
  return (
    <CatalogForm title={mode === "edit" ? "ویرایش مقصد" : "مقصد جدید"} description="تصویر باید از /images/cities یا /images/provinces خوانده شود." disabled={disabled} submitLabel={mode === "edit" ? "ذخیره تغییرات" : "ثبت در دیتابیس"} onSubmit={(event, data) => onSubmit(endpoint, {
      type,
      slug: text(data, "slug"), name: text(data, "name"), description: optional(data, "description"),
      imageUrl: optional(data, "imageUrl"), parentProvinceId: type === "CITY" ? optional(data, "parentProvinceId") : null,
      isFeatured: data.get("isFeatured") === "on", displayOrder: selectedPosition,
      primarySourceUrl: optional(data, "primarySourceUrl"), sourceType: optional(data, "sourceType"), notes: optional(data, "notes"),
      publicationStatus: text(data, "publicationStatus"),
    }, event.currentTarget, mode === "edit" ? "PATCH" : "POST")}>
      <label>نوع مقصد<select name="type" value={type} onChange={(event) => { const nextType = event.target.value as "CITY" | "PROVINCE"; setType(nextType); setDisplayOrder((catalog?.destinations ?? []).filter((item) => item.type === nextType && item.id !== initial?.id).length + 1); }}><option value="CITY">شهر</option><option value="PROVINCE">استان</option></select></label>
      <label>نام<input name="name" required placeholder="مثلاً مشهد" defaultValue={initial?.name} /></label>
      <label>Slug<input name="slug" dir="ltr" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="mashhad" value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
      {type === "CITY" ? <label>استان والد<select name="parentProvinceId" required defaultValue={initial?.parentProvinceId ?? ""}><option value="" disabled>انتخاب استان</option>{catalog?.destinations.filter((item) => item.type === "PROVINCE").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label> : null}
      <label className="catalog-field-wide">توضیحات<textarea name="description" rows={3} defaultValue={initial?.description ?? ""} /></label>
      <CatalogMediaField name="imageUrl" label="تصویر مقصد" slug={slug} kind={type === "CITY" ? "CITY_IMAGE" : "PROVINCE_IMAGE"} value={imageUrl} suggestedValue={suggestedImageUrl} onChange={setImageUrlOverride} />
      <div className="catalog-field-wide catalog-order-manager">
        <label>جایگاه در فهرست {type === "CITY" ? "شهرها" : "استان‌ها"}<select name="displayOrder" value={selectedPosition} onChange={(event) => setDisplayOrder(Number(event.target.value))}>{Array.from({ length: maxPosition }, (_, index) => index + 1).map((position) => <option value={position} key={position}>{position.toLocaleString("fa-IR")} — {position === 1 ? "ابتدای فهرست" : position === maxPosition ? "انتهای فهرست" : `قبل از ${orderedPeers[position - 1]?.name}`}</option>)}</select></label>
        <div className="catalog-order-preview" aria-label="پیش‌نمایش ترتیب مقصدها">{orderPreview.map((item, index) => <span className={item.id === "__selected__" ? "is-selected" : ""} key={item.id}>{(index + 1).toLocaleString("fa-IR")}. {item.name}</span>)}</div>
        <small>با ذخیره، این مقصد در جایگاه انتخاب‌شده قرار می‌گیرد و موارد بعدی خودکار یک ردیف جابه‌جا می‌شوند.</small>
      </div>
      <label>نوع منبع<input name="sourceType" dir="ltr" placeholder="WIKIPEDIA" defaultValue={initial?.sourceType ?? ""} /></label>
      <label className="catalog-field-wide">لینک منبع<input name="primarySourceUrl" dir="ltr" type="url" defaultValue={initial?.primarySourceUrl ?? ""} /></label>
      <label className="catalog-field-wide">یادداشت داخلی<textarea name="notes" rows={2} defaultValue={initial?.notes ?? ""} /></label>
      <label>وضعیت انتشار<PublicationSelect value={initial?.publicationStatus} /></label>
      <label className="catalog-checkbox"><input name="isFeatured" type="checkbox" defaultChecked={initial?.isFeatured} /> مقصد منتخب باشد</label>
    </CatalogForm>
  );
}

function HotelForm({ disabled, onSubmit, mode, initial }: { disabled: boolean; onSubmit: SubmitHandler; mode: CatalogMode; initial?: CatalogHotel }) {
  const endpoint = mode === "edit" && initial ? `hotels/${initial.id}` : "hotels";
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [imageUrlOverride, setImageUrlOverride] = useState<string | null>(initial?.imageUrl ?? null);
  const [logoUrlOverride, setLogoUrlOverride] = useState<string | null>(initial?.logoUrl ?? null);
  const suggestedImageUrl = slug ? `/images/hotels/${slug}.webp` : "";
  const suggestedLogoUrl = slug ? `/images/hotels/${slug}-logo.webp` : "";
  return (
    <CatalogForm title={mode === "edit" ? "ویرایش هتل" : "هتل جدید"} description="فیلدها با مدل فعلی Hotel و فایل Import سازگارند." disabled={disabled} submitLabel={mode === "edit" ? "ذخیره تغییرات" : "ثبت در دیتابیس"} onSubmit={(event, data) => onSubmit(endpoint, {
      slug: text(data, "slug"), name: text(data, "name"), description: optional(data, "description"), countryCode: text(data, "countryCode").toUpperCase(), city: text(data, "city"),
      address: optional(data, "address"), websiteUrl: optional(data, "websiteUrl"),
      imageUrl: optional(data, "imageUrl"), logoUrl: optional(data, "logoUrl"), starRating: optionalNumber(data, "starRating"), publicationStatus: text(data, "publicationStatus"),
    }, event.currentTarget, mode === "edit" ? "PATCH" : "POST")}>
      <label>نام هتل<input name="name" required defaultValue={initial?.name} /></label><label>Slug<input name="slug" dir="ltr" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
      <label>شهر<input name="city" required defaultValue={initial?.city} /></label><label>کد کشور<input name="countryCode" dir="ltr" defaultValue={initial?.countryCode ?? "IR"} required maxLength={2} /></label>
      <label>ستاره رسمی<select name="starRating" defaultValue={initial?.starRating ?? ""}><option value="">نامشخص</option>{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label><label>وضعیت انتشار<PublicationSelect value={initial?.publicationStatus} /></label>
      <label className="catalog-field-wide">توضیحات<textarea name="description" rows={3} defaultValue={initial?.description ?? ""} /></label><label className="catalog-field-wide">آدرس<input name="address" defaultValue={initial?.address ?? ""} /></label>
      <label className="catalog-field-wide">وب‌سایت یا صفحه رسمی<input name="websiteUrl" dir="ltr" type="url" defaultValue={initial?.websiteUrl ?? ""} /></label>
      <CatalogMediaField name="imageUrl" label="عکس اصلی هتل" slug={slug} kind="HOTEL_IMAGE" value={imageUrlOverride ?? suggestedImageUrl} suggestedValue={suggestedImageUrl} onChange={setImageUrlOverride} />
      <CatalogMediaField name="logoUrl" label="لوگوی هتل" slug={slug} kind="HOTEL_LOGO" value={logoUrlOverride ?? suggestedLogoUrl} suggestedValue={suggestedLogoUrl} onChange={setLogoUrlOverride} />
    </CatalogForm>
  );
}

function PersonForm({ disabled, onSubmit, mode, initial }: { disabled: boolean; onSubmit: SubmitHandler; mode: CatalogMode; initial?: CatalogPerson }) {
  const endpoint = mode === "edit" && initial ? `notable-people/${initial.id}` : "notable-people";
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [imageUrlOverride, setImageUrlOverride] = useState<string | null>(initial?.imageUrl ?? null);
  const suggestedImageUrl = slug ? `/images/people/${slug}.webp` : "";
  return (
    <CatalogForm title={mode === "edit" ? "ویرایش چهره" : "چهره جدید"} description="آیدی اینستاگرام بدون @ ذخیره می‌شود و برای اتصال ویدیوها استفاده خواهد شد." disabled={disabled} submitLabel={mode === "edit" ? "ذخیره تغییرات" : "ثبت در دیتابیس"} onSubmit={(event, data) => onSubmit(endpoint, {
      slug: text(data, "slug"), displayName: text(data, "displayName"), instagramHandle: optional(data, "instagramHandle"), primaryCategory: text(data, "primaryCategory"),
      occupation: optional(data, "occupation"), followerCount: optionalNumber(data, "followerCount"), biography: optional(data, "biography"), countryCode: optional(data, "countryCode")?.toUpperCase() ?? null,
      imageUrl: optional(data, "imageUrl"), publicationStatus: text(data, "publicationStatus"),
    }, event.currentTarget, mode === "edit" ? "PATCH" : "POST")}>
      <label>نام نمایشی<input name="displayName" required defaultValue={initial?.displayName} /></label><label>Slug<input name="slug" dir="ltr" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
      <label>آیدی اینستاگرام<input name="instagramHandle" dir="ltr" pattern="[A-Za-z0-9._]+" defaultValue={initial?.instagramHandle ?? ""} /></label>
      <label>دسته‌بندی<select name="primaryCategory" defaultValue={initial?.primaryCategory ?? "INFLUENCER"}><option value="ACTOR">بازیگر</option><option value="ATHLETE">ورزشکار</option><option value="INFLUENCER">اینفلوئنسر</option><option value="MUSICIAN">موسیقی</option><option value="PUBLIC_FIGURE">چهره عمومی</option></select></label>
      <label>عنوان فعالیت<input name="occupation" defaultValue={initial?.occupation ?? ""} /></label><label>تعداد دنبال‌کننده<input name="followerCount" type="number" min="0" dir="ltr" defaultValue={initial?.followerCount ?? ""} /></label>
      <label>کد کشور<input name="countryCode" defaultValue={initial?.countryCode ?? "IR"} maxLength={2} dir="ltr" /></label><label>وضعیت انتشار<PublicationSelect value={initial?.publicationStatus} /></label>
      <CatalogMediaField name="imageUrl" label="عکس چهره" slug={slug} kind="PERSON_IMAGE" value={imageUrlOverride ?? suggestedImageUrl} suggestedValue={suggestedImageUrl} onChange={setImageUrlOverride} />
      <label className="catalog-field-wide">زندگی‌نامه<textarea name="biography" rows={4} defaultValue={initial?.biography ?? ""} /></label>
    </CatalogForm>
  );
}

function VideoForm({ catalog, disabled, onSubmit }: { catalog: CatalogData | null; disabled: boolean; onSubmit: SubmitHandler }) {
  const [videoCategory, setVideoCategory] = useState<"TRAVEL" | "HOTEL">("TRAVEL");
  const [videoId, setVideoId] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [destinationIds, setDestinationIds] = useState<string[]>([]);
  const [hotelIds, setHotelIds] = useState<string[]>([]);
  const [mediaUrlOverride, setMediaUrlOverride] = useState<string | null>(null);
  const [thumbnailUrlOverride, setThumbnailUrlOverride] = useState<string | null>(null);

  const personSlug = catalog?.notablePeople.find(
    (person) => person.instagramHandle === instagramUsername,
  )?.slug;
  const existingPersonMediaFolder = catalog?.videos
    .find(
      (video) =>
        video.videoCategory === videoCategory &&
        video.instagramUsername === instagramUsername,
    )
    ?.mediaUrl.match(/^\/(?:travel-videos|hotel-videos)\/([^/]+)\//)?.[1];
  const personMediaFolder = existingPersonMediaFolder ?? personSlug;
  const selectedHotels = (catalog?.hotels ?? []).filter((hotel) =>
    hotelIds.includes(hotel.id),
  );
  const sequence = videoSequence(videoId);
  const hotelFilePrefix = selectedHotels.length === 1
    ? selectedHotels[0].slug
    : selectedHotels.length > 1
      ? "multi-hotel"
      : "hotel";
  const suggestedStem = personMediaFolder && sequence
    ? videoCategory === "TRAVEL"
      ? `/travel-videos/${personMediaFolder}/${sequence}`
      : `/hotel-videos/${personMediaFolder}/${hotelFilePrefix}-${sequence}`
    : "";
  const suggestedMediaUrl = suggestedStem ? `${suggestedStem}.mp4` : "";
  const suggestedThumbnailUrl = suggestedStem
    ? `${suggestedStem}-thumbnail.webp`
    : "";
  const mediaUrl = mediaUrlOverride ?? suggestedMediaUrl;
  const thumbnailUrl = thumbnailUrlOverride ?? suggestedThumbnailUrl;

  function resetVideoFormState() {
    setVideoCategory("TRAVEL");
    setVideoId("");
    setInstagramUsername("");
    setCreatorError(null);
    setDestinationIds([]);
    setHotelIds([]);
    setMediaUrlOverride(null);
    setThumbnailUrlOverride(null);
  }

  return (
    <CatalogForm title="ویدیوی جدید" description="نوع ویدیو مسیر رسانه و محل نمایش آینده را مشخص می‌کند؛ مسیر پیشنهادی همچنان قابل ویرایش است." disabled={disabled} onSubmit={async (event, data) => {
      if (!instagramUsername) {
        setCreatorError("یک سازنده را از فهرست انتخاب کنید.");
        return;
      }

      const succeeded = await onSubmit("videos", {
      id: videoId, videoCategory, instagramUsername, platform: text(data, "platform"), personCategory: optional(data, "personCategory"), contentType: text(data, "contentType"),
      sourceUrl: text(data, "sourceUrl"), title: text(data, "title"), placeName: text(data, "placeName"), placeType: text(data, "placeType"), publishedDate: optional(data, "publishedDate"),
      captionSummary: optional(data, "captionSummary"), evidenceType: text(data, "evidenceType"), verificationStatus: text(data, "verificationStatus"), notes: optional(data, "notes"),
      mediaUrl, thumbnailUrl, publicationStatus: text(data, "publicationStatus"), destinationIds, hotelIds,
      }, event.currentTarget);
      if (succeeded) resetVideoFormState();
    }}>
      <label>نوع ویدیو<select name="videoCategory" value={videoCategory} onChange={(event) => setVideoCategory(event.target.value as "TRAVEL" | "HOTEL")}><option value="TRAVEL">ویدیوی سفر</option><option value="HOTEL">ویدیوی هتل</option></select></label>
      <label>شناسه ویدیو<input name="id" dir="ltr" required placeholder="username-001" value={videoId} onChange={(event) => setVideoId(event.target.value)} /></label>
      <SearchableSingleSelect
        label="سازنده"
        searchPlaceholder="جست‌وجوی نام یا آیدی اینستاگرام"
        emptyText="هنوز سازنده‌ای انتخاب نشده است."
        noResultsText="سازنده‌ای پیدا نشد."
        selectedAriaLabel="سازنده انتخاب‌شده"
        items={(catalog?.notablePeople ?? []).filter((person) => person.instagramHandle).map((person) => ({ id: person.id, value: person.instagramHandle ?? "", label: `${person.displayName} · @${person.instagramHandle}` }))}
        selectedValue={instagramUsername}
        error={creatorError}
        onChange={(value) => {
          setInstagramUsername(value);
          setCreatorError(null);
        }}
      />
      <label>عنوان<input name="title" required /></label><label>نام مکان<input name="placeName" required /></label>
      <label>پلتفرم<input name="platform" dir="ltr" defaultValue="INSTAGRAM" required /></label><label>نوع محتوا<input name="contentType" dir="ltr" list="catalog-content-type-options" placeholder="انتخاب یا ورود دستی" required /><small>از پیشنهادها انتخاب کنید یا مقدار دلخواه بنویسید.</small></label>
      <label>نوع مکان<input name="placeType" dir="ltr" list="catalog-place-type-options" placeholder="انتخاب یا ورود دستی" required /><small>از پیشنهادها انتخاب کنید یا مقدار دلخواه بنویسید.</small></label><label>دسته سازنده<input name="personCategory" dir="ltr" list="catalog-person-category-options" placeholder="انتخاب یا ورود دستی" /><small>از پیشنهادها انتخاب کنید یا مقدار دلخواه بنویسید.</small></label>
      <datalist id="catalog-content-type-options">
        <option value="POST">پست</option><option value="REEL">ریلز</option><option value="STORY">استوری</option><option value="HIGHLIGHT">هایلایت</option><option value="LIVE">لایو</option><option value="CAROUSEL">پست چنداسلایدی</option><option value="IGTV">IGTV</option><option value="OTHER">سایر</option>
      </datalist>
      <datalist id="catalog-place-type-options">
        <option value="CULTURAL">فرهنگی</option><option value="NATURE">طبیعت</option><option value="HOTEL">هتل</option><option value="HISTORICAL">تاریخی</option><option value="RELIGIOUS">مذهبی</option><option value="URBAN">شهری</option><option value="RURAL">روستایی</option><option value="BEACH">ساحل</option><option value="MOUNTAIN">کوهستان</option><option value="DESERT">کویر</option><option value="FOOD">غذا</option><option value="EVENT">رویداد</option><option value="OTHER">سایر</option>
      </datalist>
      <datalist id="catalog-person-category-options">
        <option value="INFLUENCER">اینفلوئنسر</option><option value="TRAVEL_BLOGGER">بلاگر سفر</option><option value="CONTENT_CREATOR">تولیدکننده محتوا</option><option value="PHOTOGRAPHER">عکاس</option><option value="JOURNALIST">روزنامه‌نگار</option><option value="ACTOR">بازیگر</option><option value="ATHLETE">ورزشکار</option><option value="MUSICIAN">موسیقی‌دان</option><option value="PUBLIC_FIGURE">چهره عمومی</option><option value="OTHER">سایر</option>
      </datalist>
      <label>تاریخ انتشار<input name="publishedDate" dir="ltr" placeholder="1404/8/22" /></label><label>وضعیت بررسی<select name="verificationStatus" defaultValue="VERIFIED"><option value="PENDING">در انتظار</option><option value="VERIFIED">تأییدشده</option><option value="REJECTED">ردشده</option></select></label>
      <label className="catalog-field-wide">لینک پست اصلی<input name="sourceUrl" type="url" dir="ltr" required /></label>
      <SearchableMultiSelect
        label={`مقصدها${videoCategory === "TRAVEL" ? " (حداقل یک مورد)" : " (اختیاری)"}`}
        searchPlaceholder="جست‌وجوی شهر یا استان"
        items={(catalog?.destinations ?? []).map((item) => ({ id: item.id, label: `${item.type === "CITY" ? "شهر" : "استان"} ${item.name}` }))}
        selectedIds={destinationIds}
        onChange={setDestinationIds}
      />
      <SearchableMultiSelect
        label={`هتل‌های مرتبط${videoCategory === "HOTEL" ? " (حداقل یک مورد)" : " (اختیاری)"}`}
        searchPlaceholder="جست‌وجوی نام هتل یا شهر"
        items={(catalog?.hotels ?? []).map((hotel) => ({ id: hotel.id, label: `${hotel.name} · ${hotel.city}` }))}
        selectedIds={hotelIds}
        onChange={setHotelIds}
      />
      <label className="catalog-field-wide">مسیر ویدیو<input name="mediaUrl" dir="ltr" required value={mediaUrl} placeholder="پس از انتخاب سازنده و شناسه پیشنهاد می‌شود" onChange={(event) => setMediaUrlOverride(event.target.value === suggestedMediaUrl ? null : event.target.value)} /><small>مسیر پیشنهادی خودکار است؛ در صورت نیاز می‌توانید آن را تغییر دهید.</small></label>
      <label className="catalog-field-wide">مسیر کاور<input name="thumbnailUrl" dir="ltr" required value={thumbnailUrl} placeholder="پس از انتخاب سازنده و شناسه پیشنهاد می‌شود" onChange={(event) => setThumbnailUrlOverride(event.target.value === suggestedThumbnailUrl ? null : event.target.value)} /></label>
      <label className="catalog-field-wide">خلاصه کپشن<textarea name="captionSummary" rows={3} /></label>
      <label>نوع مدرک<input name="evidenceType" dir="ltr" defaultValue="ORIGINAL_POST" required /></label><label>وضعیت انتشار<PublicationSelect /></label>
      <label className="catalog-field-wide">یادداشت داخلی<textarea name="notes" rows={2} /></label>
    </CatalogForm>
  );
}

type CatalogMediaKind = "HOTEL_IMAGE" | "HOTEL_LOGO" | "PERSON_IMAGE" | "CITY_IMAGE" | "PROVINCE_IMAGE";

function CatalogMediaField({ name, label, slug, kind, value, suggestedValue, onChange }: { name: string; label: string; slug: string; kind: CatalogMediaKind; value: string; suggestedValue: string; onChange: (value: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectFile = useCallback((file: File) => {
    if (file.type && !file.type.startsWith("image/")) {
      setUploadFeedback("فایل انتخاب‌شده باید تصویر باشد.");
      return;
    }
    if (file.size > 15_000_000) {
      setUploadFeedback("حجم تصویر نباید بیشتر از ۱۵ مگابایت باشد.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadFeedback(null);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!dialogOpen) return;
    function pasteImage(event: ClipboardEvent) {
      const item = Array.from(event.clipboardData?.items ?? []).find((candidate) => candidate.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) {
        setUploadFeedback("تصویری در کلیپ‌بورد پیدا نشد.");
        return;
      }
      event.preventDefault();
      selectFile(file);
    }
    window.addEventListener("paste", pasteImage);
    return () => window.removeEventListener("paste", pasteImage);
  }, [dialogOpen, selectFile]);

  function closeDialog() {
    if (uploading) return;
    setDialogOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setDragging(false);
  }

  async function upload(file: File) {
    if (!slug) {
      setUploadFeedback("ابتدا Slug را وارد کنید.");
      return;
    }
    if (!window.confirm("اگر فایل هم‌نامی وجود داشته باشد با تصویر جدید جایگزین می‌شود. ادامه می‌دهید؟")) return;
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);
    body.append("slug", slug);
    setUploading(true);
    setUploadFeedback(null);
    try {
      const result = await browserApi<{ data: { path: string } }>("/admin/catalog/media", { method: "POST", body });
      onChange(result.data.path);
      setUploadFeedback("تصویر به WebP تبدیل و ذخیره شد؛ حالا فرم را ذخیره کنید.");
      setDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (caught) {
      setUploadFeedback(caught instanceof Error ? caught.message : "آپلود فایل انجام نشد.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="catalog-field-wide catalog-media-field">
      <label>{label}<input name={name} dir="ltr" value={value} placeholder={suggestedValue} onChange={(event) => onChange(event.target.value === suggestedValue ? null : event.target.value)} /></label>
      <button className="catalog-media-upload" type="button" disabled={uploading} onClick={() => {
        if (!slug) {
          setUploadFeedback("ابتدا Slug را وارد کنید.");
          return;
        }
        setUploadFeedback(null);
        setDialogOpen(true);
      }}>{uploading ? "در حال ذخیره…" : "افزودن تصویر"}</button>
      <small>تصویر با نام و مسیر پیشنهادی Slug به فرمت WebP ذخیره می‌شود.</small>
      {uploadFeedback ? <small className={uploadFeedback.includes("ذخیره شد") ? "catalog-field-success" : "catalog-field-error"} role="status">{uploadFeedback}</small> : null}

      {dialogOpen ? (
        <div className="catalog-upload-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
          <section className="catalog-upload-dialog" role="dialog" aria-modal="true" aria-label={`افزودن ${label}`}>
            <header>
              <div><strong>افزودن {label}</strong><small dir="ltr">{suggestedValue}</small></div>
              <button type="button" aria-label="بستن پنجره" onClick={closeDialog}>×</button>
            </header>
            <button
              className={`catalog-upload-dropzone${dragging ? " is-dragging" : ""}`}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files[0];
                if (file) selectFile(file);
              }}
            >
              {previewUrl ? <Image src={previewUrl} alt="پیش‌نمایش تصویر انتخاب‌شده" width={360} height={190} unoptimized /> : <span className="catalog-upload-icon" aria-hidden="true">＋</span>}
              <strong>{selectedFile ? selectedFile.name || "تصویر کپی‌شده" : "تصویر را اینجا رها کنید"}</strong>
              <span>یا برای انتخاب از دستگاه کلیک کنید</span>
              <span>تصویر کپی‌شده را نیز می‌توانید اینجا بچسبانید</span>
            </button>
            <input ref={fileInputRef} className="catalog-upload-file-input" type="file" accept="image/*,.avif,.heic,.heif,.tif,.tiff,.gif,.svg" onChange={(event) => { const file = event.target.files?.[0]; if (file) selectFile(file); event.target.value = ""; }} />
            <small>JPG، PNG، WebP، AVIF، HEIC، HEIF، TIFF، GIF، SVG و دیگر تصاویر قابل پردازش؛ حداکثر ۱۵ مگابایت.</small>
            {uploadFeedback ? <small className="catalog-field-error" role="alert">{uploadFeedback}</small> : null}
            <footer>
              <button type="button" className="button button-secondary" disabled={uploading} onClick={closeDialog}>انصراف</button>
              <button type="button" className="button" disabled={uploading || !selectedFile} onClick={() => { if (selectedFile) void upload(selectedFile); }}>{uploading ? "در حال تبدیل و ذخیره…" : "تبدیل و ذخیره تصویر"}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}

type MultiSelectItem = { id: string; label: string };

type SingleSelectItem = MultiSelectItem & { value: string };

function SearchableSingleSelect({ label, searchPlaceholder, emptyText, noResultsText, selectedAriaLabel, items, selectedValue, error, onChange }: { label: string; searchPlaceholder: string; emptyText: string; noResultsText: string; selectedAriaLabel: string; items: SingleSelectItem[]; selectedValue: string; error: string | null; onChange: (value: string) => void }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);
  const visibleItems = items.filter((item) =>
    normalizeSearch(item.label).includes(normalizedQuery),
  );
  const selectedItem = items.find((item) => item.value === selectedValue);

  return (
    <div className="catalog-field-wide catalog-multi-field">
      <span>{label}</span>
      {!selectedItem ? <input type="search" value={query} placeholder={searchPlaceholder} aria-label={searchPlaceholder} onChange={(event) => setQuery(event.target.value)} /> : null}
      {selectedItem ? (
        <div className="catalog-selected-items" aria-label={selectedAriaLabel}>
          <button type="button" onClick={() => onChange("")}>{selectedItem.label}<span aria-hidden="true">×</span></button>
        </div>
      ) : <small>{emptyText}</small>}
      {error ? <small className="catalog-field-error" role="alert">{error}</small> : null}
      {!selectedItem ? (
        <div className="catalog-option-list" role="listbox" aria-multiselectable="false">
          {visibleItems.length > 0 ? visibleItems.map((item) => (
            <button type="button" role="option" aria-selected="false" key={item.id} onClick={() => { onChange(item.value); setQuery(""); }}>
              <span>{item.label}</span><strong>انتخاب</strong>
            </button>
          )) : <small className="catalog-option-empty">{noResultsText}</small>}
        </div>
      ) : null}
    </div>
  );
}

function SearchableMultiSelect({ label, searchPlaceholder, items, selectedIds, onChange }: { label: string; searchPlaceholder: string; items: MultiSelectItem[]; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);
  const visibleItems = items.filter((item) =>
    normalizeSearch(item.label).includes(normalizedQuery),
  );
  const selectedItems = selectedIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is MultiSelectItem => Boolean(item));

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="catalog-field-wide catalog-multi-field">
      <span>{label}</span>
      <input type="search" value={query} placeholder={searchPlaceholder} onChange={(event) => setQuery(event.target.value)} />
      {selectedItems.length > 0 ? (
        <div className="catalog-selected-items" aria-label="موارد انتخاب‌شده">
          {selectedItems.map((item) => (
            <button type="button" key={item.id} onClick={() => toggle(item.id)}>{item.label}<span aria-hidden="true">×</span></button>
          ))}
        </div>
      ) : <small>هنوز موردی انتخاب نشده است.</small>}
      <div className="catalog-option-list" role="listbox" aria-multiselectable="true">
        {visibleItems.length > 0 ? visibleItems.map((item) => {
          const selected = selectedIds.includes(item.id);
          return (
            <button type="button" role="option" aria-selected={selected} className={selected ? "is-selected" : ""} key={item.id} onClick={() => toggle(item.id)}>
              <span>{item.label}</span><strong>{selected ? "✓ انتخاب‌شده" : "انتخاب"}</strong>
            </button>
          );
        }) : <small className="catalog-option-empty">موردی پیدا نشد.</small>}
      </div>
    </div>
  );
}

function CatalogForm({ title, description, disabled, submitLabel = "ثبت در دیتابیس", onSubmit, children }: { title: string; description: string; disabled: boolean; submitLabel?: string; onSubmit: (event: FormEvent<HTMLFormElement>, data: FormData) => void; children: React.ReactNode }) {
  return (
    <form className="catalog-form" onSubmit={(event) => { event.preventDefault(); onSubmit(event, new FormData(event.currentTarget)); }}>
      <div className="catalog-form-heading"><h2>{title}</h2><p>{description}</p></div>
      <fieldset disabled={disabled}><div className="catalog-form-grid">{children}</div><button className="button catalog-submit" type="submit">{disabled ? "در حال ذخیره…" : submitLabel}</button></fieldset>
    </form>
  );
}

function PublicationSelect({ value = "PUBLISHED" }: { value?: string }) { return <select name="publicationStatus" defaultValue={value}><option value="PUBLISHED">منتشرشده</option><option value="DRAFT">پیش‌نویس</option><option value="ARCHIVED">آرشیوشده</option></select>; }

function CatalogSummary({ section, catalog }: { section: CatalogSection; catalog: CatalogData | null }) {
  const items = section === "destinations" ? catalog?.destinations.map((item) => `${item.type === "CITY" ? "شهر" : "استان"} ${item.name}`) : section === "hotels" ? catalog?.hotels.map((item) => item.name) : section === "people" ? catalog?.notablePeople.map((item) => item.displayName) : catalog?.videos.map((item) => item.title ?? item.id);
  return <aside className="catalog-summary"><span className="section-eyebrow">داده‌های موجود</span><h2>{(items?.length ?? 0).toLocaleString("fa-IR")} مورد</h2><div>{items?.slice(0, 12).map((item) => <span key={item}>{item}</span>)}</div>{(items?.length ?? 0) > 12 ? <small>و {(items!.length - 12).toLocaleString("fa-IR")} مورد دیگر</small> : null}</aside>;
}

function text(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function optional(data: FormData, key: string) { const value = text(data, key); return value || null; }
function optionalNumber(data: FormData, key: string) { const value = text(data, key); return value ? Number(value) : undefined; }

function videoSequence(videoId: string): string {
  const match = videoId.trim().match(/(?:^|-)(\d+)$/);
  return match ? match[1].padStart(3, "0") : "";
}

function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase("fa-IR")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .trim();
}
