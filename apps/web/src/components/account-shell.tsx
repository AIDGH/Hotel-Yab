"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { browserApi } from "@/lib/browser-api";
import { formatIranianMobile } from "@/lib/labels";
import { useAuth, type AuthUser } from "./auth-provider";
import { SiteIcon } from "./site-icon";

type AccountSection = "profile" | "activity" | "library";

export function AccountShell({
  active,
  children,
}: {
  active: AccountSection;
  children: ReactNode;
}) {
  const { user, updateUser, logout } = useAuth();
  const [avatarFeedback, setAvatarFeedback] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarDragging, setAvatarDragging] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const selectAvatar = useCallback((file: File) => {
    if (file.type && !file.type.startsWith("image/")) {
      setAvatarFeedback({ tone: "error", text: "فایل انتخاب‌شده باید تصویر باشد." });
      return;
    }
    if (file.size > 15_000_000) {
      setAvatarFeedback({ tone: "error", text: "حجم تصویر نباید بیشتر از ۱۵ مگابایت باشد." });
      return;
    }
    setSelectedAvatar(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setAvatarFeedback(null);
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    if (!avatarDialogOpen) return;
    function pasteAvatar(event: ClipboardEvent) {
      const item = Array.from(event.clipboardData?.items ?? []).find((candidate) => candidate.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) {
        setAvatarFeedback({ tone: "error", text: "تصویری در کلیپ‌بورد پیدا نشد." });
        return;
      }
      event.preventDefault();
      selectAvatar(file);
    }
    window.addEventListener("paste", pasteAvatar);
    return () => window.removeEventListener("paste", pasteAvatar);
  }, [avatarDialogOpen, selectAvatar]);

  if (!user) return children;

  function closeAvatarDialog() {
    if (avatarSaving) return;
    setAvatarDialogOpen(false);
    setSelectedAvatar(null);
    setAvatarPreviewUrl(null);
    setAvatarDragging(false);
  }

  async function uploadAvatar(file: File) {
    setAvatarSaving(true);
    setAvatarFeedback(null);
    const body = new FormData();
    body.append("avatar", file);
    try {
      const result = await browserApi<{ data: AuthUser }>("/auth/me/avatar", {
        method: "POST",
        body,
      });
      updateUser(result.data);
      setAvatarFeedback({ tone: "success", text: "عکس پروفایل ذخیره شد." });
      setAvatarDialogOpen(false);
      setSelectedAvatar(null);
      setAvatarPreviewUrl(null);
    } catch (caught) {
      setAvatarFeedback({
        tone: "error",
        text: caught instanceof Error ? caught.message : "ذخیره عکس انجام نشد؛ فرمت و حجم فایل را بررسی کنید.",
      });
    } finally {
      setAvatarSaving(false);
    }
  }

  async function removeAvatar() {
    setAvatarSaving(true);
    setAvatarFeedback(null);
    try {
      const result = await browserApi<{ data: AuthUser }>("/auth/me/avatar", {
        method: "DELETE",
      });
      updateUser(result.data);
      setAvatarFeedback({ tone: "success", text: "عکس پروفایل حذف شد." });
    } catch {
      setAvatarFeedback({ tone: "error", text: "حذف عکس انجام نشد." });
    } finally {
      setAvatarSaving(false);
    }
  }

  const accountName = user.displayName ?? user.username ?? "کاربر هتل‌یاب";

  return (
    <div className="account-layout">
      <aside className="account-sidebar">
        <div className="account-sidebar-user">
          <div className="account-profile-avatar">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={`عکس پروفایل ${accountName}`}
                width={96}
                height={96}
                unoptimized
              />
            ) : (
              <span aria-hidden="true">
                {(user.firstName ?? user.username ?? "ک").slice(0, 1)}
              </span>
            )}
          </div>
          <div>
            <strong>{accountName}</strong>
            <bdi dir="ltr">{formatIranianMobile(user.mobile)}</bdi>
          </div>
        </div>

        <div className="account-avatar-actions">
          <button className="button button-small button-secondary" type="button" disabled={avatarSaving} onClick={() => { setAvatarFeedback(null); setAvatarDialogOpen(true); }}>
            {avatarSaving ? "در حال ذخیره…" : "انتخاب عکس"}
          </button>
          {user.avatarUrl ? (
            <button
              type="button"
              className="account-avatar-remove"
              onClick={() => void removeAvatar()}
              disabled={avatarSaving}
            >
              حذف عکس
            </button>
          ) : null}
          <small>فرمت‌های رایج تصویر؛ تبدیل خودکار به WebP، حداکثر ۱۵ مگابایت</small>
          {avatarFeedback ? (
            <p
              className={`form-feedback form-feedback-${avatarFeedback.tone}`}
              role={avatarFeedback.tone === "error" ? "alert" : "status"}
            >
              {avatarFeedback.text}
            </p>
          ) : null}

          {avatarDialogOpen ? (
            <div className="catalog-upload-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAvatarDialog(); }}>
              <section className="catalog-upload-dialog" role="dialog" aria-modal="true" aria-label="افزودن عکس پروفایل">
                <header>
                  <div><strong>افزودن عکس پروفایل</strong><small>تصویر بهینه و به WebP تبدیل می‌شود.</small></div>
                  <button type="button" aria-label="بستن پنجره" onClick={closeAvatarDialog}>×</button>
                </header>
                <button
                  className={`catalog-upload-dropzone${avatarDragging ? " is-dragging" : ""}`}
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); setAvatarDragging(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAvatarDragging(false); }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setAvatarDragging(false);
                    const file = event.dataTransfer.files[0];
                    if (file) selectAvatar(file);
                  }}
                >
                  {avatarPreviewUrl ? <Image src={avatarPreviewUrl} alt="پیش‌نمایش عکس پروفایل" width={360} height={190} unoptimized /> : <span className="catalog-upload-icon"><SiteIcon name="image" /></span>}
                  <strong>{selectedAvatar ? selectedAvatar.name || "تصویر کپی‌شده" : "تصویر را اینجا رها کنید"}</strong>
                  <span>یا برای انتخاب از دستگاه کلیک کنید</span>
                  <span>تصویر کپی‌شده را نیز می‌توانید اینجا بچسبانید</span>
                </button>
                <input ref={avatarInputRef} className="catalog-upload-file-input" type="file" accept="image/*,.avif,.heic,.heif,.tif,.tiff,.gif,.svg" onChange={(event) => { const file = event.target.files?.[0]; if (file) selectAvatar(file); event.target.value = ""; }} />
                <small>JPG، PNG، WebP، AVIF، HEIC، HEIF، TIFF، GIF، SVG و فرمت‌های تصویری قابل پردازش؛ حداکثر ۱۵ مگابایت.</small>
                {avatarFeedback?.tone === "error" ? <small className="catalog-field-error" role="alert">{avatarFeedback.text}</small> : null}
                <footer>
                  <button type="button" className="button button-secondary" disabled={avatarSaving} onClick={closeAvatarDialog}>انصراف</button>
                  <button type="button" className="button" disabled={avatarSaving || !selectedAvatar} onClick={() => { if (selectedAvatar) void uploadAvatar(selectedAvatar); }}>{avatarSaving ? "در حال تبدیل و ذخیره…" : "تبدیل و ذخیره تصویر"}</button>
                </footer>
              </section>
            </div>
          ) : null}
        </div>

        <nav className="account-section-nav" aria-label="بخش‌های حساب">
          <Link
            href="/account"
            className={active === "profile" ? "account-section-active" : ""}
          >
            <SiteIcon name="account" />
            اطلاعات حساب
          </Link>
          <Link
            href="/account/library"
            className={active === "library" ? "account-section-active" : ""}
          >
            <SiteIcon name="heart" />
            پسندیده‌ها و ذخیره‌ها
          </Link>
          <Link
            href="/account/activity"
            className={active === "activity" ? "account-section-active" : ""}
          >
            <SiteIcon name="activity" />
            فعالیت‌های من
          </Link>
          {user.role === "ADMIN" || user.role === "MODERATOR" ? (
            <Link href="/admin/users">
              <SiteIcon name="users" />
              مدیریت کاربران
            </Link>
          ) : null}
          {user.role === "MODERATOR" ? (
            <Link href="/admin/administrators">
              <SiteIcon name="administrator" />
              بررسی مدیران
            </Link>
          ) : null}
          {user.role === "ADMIN" || user.role === "MODERATOR" ? (
            <Link href="/admin/moderation">
              <SiteIcon name="moderation" />
              بررسی محتوا
            </Link>
          ) : null}
          {user.role === "ADMIN" || user.role === "MODERATOR" ? (
            <Link href="/admin/catalog">
              <SiteIcon name="catalog" />
              مدیریت داده‌ها
            </Link>
          ) : null}
          {user.notablePerson ? (
            <Link href={`/notable-people/${user.notablePerson.slug}`}>
              <SiteIcon name="profile" />
              پروفایل چهرهٔ من
            </Link>
          ) : null}
          <button type="button" onClick={() => void logout()}>
            <SiteIcon name="logout" />
            خروج از حساب
          </button>
        </nav>
      </aside>
      <div className="account-layout-content">{children}</div>
    </div>
  );
}
