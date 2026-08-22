"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { browserApi } from "@/lib/browser-api";
import { formatIranianMobile } from "@/lib/labels";

type ManagedUser = {
  id: string;
  mobile: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  email: string | null;
  instagramHandle: string | null;
  role: "USER" | "MODERATOR" | "ADMIN";
  status: "ACTIVE" | "BLOCKED";
  createdAt: string;
  lastLoginAt: string | null;
  reviewCount: number;
  commentCount: number;
};

export default function AdminUsersPage() {
  return <ManagedUsersPage />;
}

export function ManagedUsersPage({
  administratorsOnly = false,
}: {
  administratorsOnly?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async (search: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("query", search.trim());
      const result = await browserApi<{ data: ManagedUser[] }>(
        `/admin/moderation/${administratorsOnly ? "administrators" : "users"}${params.size ? `?${params}` : ""}`,
      );
      setUsers(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "دریافت کاربران انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, [administratorsOnly]);

  useEffect(() => {
    if (
      !user ||
      (administratorsOnly
        ? user.role !== "MODERATOR"
        : user.role !== "ADMIN" && user.role !== "MODERATOR")
    ) {
      return;
    }
    const timeout = window.setTimeout(() => void loadUsers(query), 300);
    return () => window.clearTimeout(timeout);
  }, [administratorsOnly, authLoading, loadUsers, query, user]);

  if (authLoading) {
    return <main className="section container admin-page"><p>در حال بررسی دسترسی…</p></main>;
  }
  const hasAccess = administratorsOnly
    ? user?.role === "MODERATOR"
    : user?.role === "ADMIN" || user?.role === "MODERATOR";
  if (!hasAccess || !user) {
    return (
      <main className="section container admin-page">
        <section className="admin-empty">
          <span className="section-eyebrow">
            {administratorsOnly ? "بررسی مدیران" : "مدیریت کاربران"}
          </span>
          <h1>دسترسی مدیریت لازم است</h1>
          <p>
            {administratorsOnly
              ? "این صفحه فقط برای ناظر محتوا در دسترس است."
              : "این صفحه فقط برای مدیر و ناظر محتوا در دسترس است."}
          </p>
          <Link className="button" href="/">بازگشت به سایت</Link>
        </section>
      </main>
    );
  }

  const actorRole = user.role as "ADMIN" | "MODERATOR";
  return (
    <main className="section container admin-page managed-users-page">
      <header className="admin-heading managed-users-heading">
        <div>
          <span className="section-eyebrow">
            {administratorsOnly ? "نظارت بر دسترسی‌های حساس" : "مدیریت حساب‌ها"}
          </span>
          <h1>{administratorsOnly ? "بررسی مدیران" : "کاربران سایت"}</h1>
          <p>
            {administratorsOnly
              ? "حساب مدیران را جداگانه بررسی، ویرایش، فعال یا مسدود کنید."
              : "کاربران و ناظرها را جست‌وجو، ویرایش، فعال یا مسدود کنید."}
          </p>
        </div>
        <div className="catalog-heading-actions">
          <Link href="/admin/moderation">صف بررسی محتوا</Link>
          {user.role === "MODERATOR" ? (
            <Link href={administratorsOnly ? "/admin/users" : "/admin/administrators"}>
              {administratorsOnly ? "مدیریت کاربران" : "بررسی مدیران"}
            </Link>
          ) : null}
          <Link href="/admin/catalog">مدیریت داده‌ها</Link>
        </div>
      </header>

      <label className="managed-user-search">
        {administratorsOnly ? "جست‌وجوی مدیر" : "جست‌وجوی کاربر"}
        <input type="search" value={query} placeholder="نام، نام‌کاربری، موبایل، ایمیل یا اینستاگرام" onChange={(event) => setQuery(event.target.value)} />
      </label>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {loading ? <p>در حال دریافت کاربران…</p> : users.length > 0 ? (
        <div className="managed-user-list">
          {users.map((managedUser) => (
            <ManagedUserCard
              key={`${managedUser.id}-${managedUser.username}-${managedUser.status}-${managedUser.role}`}
              managedUser={managedUser}
              actorRole={actorRole}
              onSaved={() => loadUsers(query)}
            />
          ))}
        </div>
      ) : (
        <div className="admin-empty"><p>{administratorsOnly ? "مدیری با این مشخصات پیدا نشد." : "کاربری با این مشخصات پیدا نشد."}</p></div>
      )}
    </main>
  );
}

function ManagedUserCard({ managedUser, actorRole, onSaved }: { managedUser: ManagedUser; actorRole: "MODERATOR" | "ADMIN"; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    setSaving(true);
    setFeedback(null);
    try {
      await browserApi(`/admin/moderation/users/${managedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          username: value("username"),
          firstName: value("firstName"),
          lastName: value("lastName"),
          email: value("email"),
          instagramHandle: value("instagramHandle"),
          status: value("status"),
          ...(actorRole === "ADMIN" ? { role: value("role") } : {}),
        }),
      });
      setFeedback({ tone: "success", text: "اطلاعات کاربر ذخیره شد." });
      await onSaved();
    } catch (caught) {
      setFeedback({ tone: "error", text: caught instanceof Error ? caught.message : "ذخیره اطلاعات انجام نشد." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="managed-user-card">
      <header>
        <div>
          <h2>{managedUser.displayName}</h2>
          <bdi dir="ltr">{formatIranianMobile(managedUser.mobile)}</bdi>
        </div>
        <div className="managed-user-badges">
          <span>{roleLabel(managedUser.role)}</span>
          <span className={managedUser.status === "BLOCKED" ? "is-blocked" : ""}>{managedUser.status === "ACTIVE" ? "فعال" : "مسدود"}</span>
        </div>
      </header>
      <small>{managedUser.reviewCount.toLocaleString("fa-IR")} نظر هتل · {managedUser.commentCount.toLocaleString("fa-IR")} دیدگاه ویدیو · عضویت {new Date(managedUser.createdAt).toLocaleDateString("fa-IR")}</small>
      <form className="managed-user-form" onSubmit={submit}>
        <label>نام‌کاربری<input name="username" dir="ltr" required defaultValue={managedUser.username ?? ""} /></label>
        <label>نام<input name="firstName" defaultValue={managedUser.firstName ?? ""} /></label>
        <label>نام خانوادگی<input name="lastName" defaultValue={managedUser.lastName ?? ""} /></label>
        <label>ایمیل<input name="email" type="email" dir="ltr" defaultValue={managedUser.email ?? ""} /></label>
        <label>آیدی اینستاگرام<input name="instagramHandle" dir="ltr" defaultValue={managedUser.instagramHandle ?? ""} /></label>
        {actorRole === "ADMIN" ? (
          <label>نقش<select name="role" defaultValue={managedUser.role}><option value="USER">کاربر</option><option value="MODERATOR">ناظر محتوا</option></select></label>
        ) : null}
        <label>وضعیت<select name="status" defaultValue={managedUser.status}><option value="ACTIVE">فعال</option><option value="BLOCKED">مسدود</option></select></label>
        <div className="managed-user-submit">
          {feedback ? <p className={`form-feedback form-feedback-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
          <button className="button button-small" type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره تغییرات"}</button>
        </div>
      </form>
    </article>
  );
}

function roleLabel(role: ManagedUser["role"]) {
  if (role === "ADMIN") return "مدیر";
  if (role === "MODERATOR") return "ناظر محتوا";
  return "کاربر";
}
