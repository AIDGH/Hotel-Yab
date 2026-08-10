"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useAuth, type AuthUser } from "@/components/auth-provider";
import { browserApi } from "@/lib/browser-api";

export default function AccountPage() {
  const { user, loading, openAuth, updateUser } = useAuth();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await browserApi<{ data: AuthUser }>("/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          username: form.get("username"),
          ...(form.get("password") ? { password: form.get("password") } : {}),
          email: form.get("email"),
          instagramHandle: form.get("instagramHandle"),
        }),
      });
      updateUser(result.data);
      setMessage("اطلاعات حساب ذخیره شد.");
    } catch {
      setMessage("ذخیره اطلاعات انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="section container account-page">
        <p>در حال بارگذاری حساب…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="section container account-page">
        <section className="account-guest-card">
          <span className="section-eyebrow">حساب من</span>
          <h1>برای دیدن حساب وارد شوید</h1>
          <p>
            نظرها، امتیازها و کامنت‌های شما پس از ورود از اینجا مدیریت می‌شوند.
          </p>
          <button className="button" type="button" onClick={openAuth}>
            ورود یا عضویت
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="section container account-page">
      <div className="account-page-heading">
        <span className="section-eyebrow">حساب من</span>
        <h1>{user.displayName ?? "تکمیل اطلاعات حساب"}</h1>
        <p>{user.mobile}</p>
      </div>
      <form className="account-profile-card auth-form" onSubmit={save}>
        <h2>اطلاعات پروفایل</h2>
        <div className="auth-form-row">
          <label>
            نام
            <input
              name="firstName"
              defaultValue={user.firstName ?? ""}
              required
            />
          </label>
          <label>
            نام خانوادگی
            <input
              name="lastName"
              defaultValue={user.lastName ?? ""}
              required
            />
          </label>
        </div>
        <label>
          نام‌کاربری
          <input
            name="username"
            dir="ltr"
            defaultValue={user.username ?? ""}
            pattern="(?=.*[A-Za-z])[A-Za-z0-9._]{3,30}"
            required
          />
        </label>
        <label>
          رمز عبور جدید <small>فقط برای تغییر رمز پر کنید</small>
          <input name="password" type="password" minLength={8} maxLength={72} />
        </label>
        <label>
          ایمیل <small>اختیاری</small>
          <input name="email" type="email" defaultValue={user.email ?? ""} />
        </label>
        <label>
          آیدی اینستاگرام <small>اختیاری</small>
          <input
            name="instagramHandle"
            dir="ltr"
            defaultValue={user.instagramHandle ?? ""}
          />
        </label>
        {user.notablePerson ? (
          <p className="account-linked-person">
            ✓ این حساب به چهرهٔ «{user.notablePerson.displayName}» متصل است.
          </p>
        ) : (
          <p className="auth-field-note">
            ثبت اینستاگرام به‌معنی تأیید چهره‌بودن نیست؛ اتصال پس از بررسی انجام
            می‌شود.
          </p>
        )}
        {message ? (
          <p className="account-save-message" role="status">
            {message}
          </p>
        ) : null}
        <button className="button" type="submit" disabled={saving}>
          {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
        </button>
      </form>
      <section className="account-activity-placeholder">
        <h2>فعالیت‌های من</h2>
        <p>
          نظرهای هتل و کامنت‌های ویدیو در نسخهٔ بعدی این صفحه یکجا قابل مدیریت
          خواهند بود.
        </p>
      </section>
    </main>
  );
}
