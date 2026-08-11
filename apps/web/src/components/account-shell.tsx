"use client";

import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, type ReactNode, useState } from "react";

import { browserApi } from "@/lib/browser-api";
import { formatIranianMobile } from "@/lib/labels";
import { useAuth, type AuthUser } from "./auth-provider";

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

  if (!user) return children;

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
      setAvatarFeedback({
        tone: "error",
        text: "فرمت عکس باید JPG، PNG یا WebP باشد.",
      });
      return;
    }
    if (file.size > 1_000_000) {
      setAvatarFeedback({
        tone: "error",
        text: "حجم عکس باید حداکثر ۱ مگابایت باشد.",
      });
      return;
    }

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
    } catch {
      setAvatarFeedback({
        tone: "error",
        text: "ذخیره عکس انجام نشد؛ فرمت و حجم فایل را بررسی کنید.",
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
          <label className="button button-small button-secondary">
            {avatarSaving ? "در حال ذخیره…" : "انتخاب عکس"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void uploadAvatar(event)}
              disabled={avatarSaving}
            />
          </label>
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
          <small>JPG، PNG یا WebP؛ حداکثر ۱ مگابایت</small>
          {avatarFeedback ? (
            <p
              className={`form-feedback form-feedback-${avatarFeedback.tone}`}
              role={avatarFeedback.tone === "error" ? "alert" : "status"}
            >
              {avatarFeedback.text}
            </p>
          ) : null}
        </div>

        <nav className="account-section-nav" aria-label="بخش‌های حساب">
          <Link
            href="/account"
            className={active === "profile" ? "account-section-active" : ""}
          >
            <span aria-hidden="true">○</span>
            اطلاعات حساب
          </Link>
          <Link
            href="/account/activity"
            className={active === "activity" ? "account-section-active" : ""}
          >
            <span aria-hidden="true">↻</span>
            فعالیت‌های من
          </Link>
          <Link
            href="/account/library"
            className={active === "library" ? "account-section-active" : ""}
          >
            <span aria-hidden="true">♡</span>
            پسندیده‌ها و ذخیره‌ها
          </Link>
          {user.role === "ADMIN" || user.role === "MODERATOR" ? (
            <Link href="/admin/moderation">
              <span aria-hidden="true">◇</span>
              پنل مدیریت
            </Link>
          ) : null}
          {user.notablePerson ? (
            <Link href={`/notable-people/${user.notablePerson.slug}`}>
              <span aria-hidden="true">☆</span>
              پروفایل چهرهٔ من
            </Link>
          ) : null}
          <button type="button" onClick={() => void logout()}>
            <span aria-hidden="true">←</span>
            خروج از حساب
          </button>
        </nav>
      </aside>
      <div className="account-layout-content">{children}</div>
    </div>
  );
}
