"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { AccountShell } from "@/components/account-shell";
import { useAuth, type AuthUser } from "@/components/auth-provider";
import { PasswordInput } from "@/components/password-input";
import {
  authErrorMessage,
  isStrongPassword,
  STRONG_PASSWORD_ERROR,
} from "@/lib/auth-errors";
import { browserApi } from "@/lib/browser-api";
import { formatIranianMobile } from "@/lib/labels";

export default function AccountPage() {
  const { user, loading, openAuth, updateUser } = useAuth();
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password && !isStrongPassword(password)) {
      setFeedback({ tone: "error", text: STRONG_PASSWORD_ERROR });
      setSaving(false);
      return;
    }
    try {
      const result = await browserApi<{ data: AuthUser }>("/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          username: form.get("username"),
          ...(password ? { password } : {}),
          email: form.get("email"),
          instagramHandle: form.get("instagramHandle"),
        }),
      });
      updateUser(result.data);
      setFeedback({ tone: "success", text: "اطلاعات حساب ذخیره شد." });
    } catch (caught) {
      setFeedback({ tone: "error", text: authErrorMessage(caught) });
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
            اطلاعات پروفایل و راه‌های ارتباطی شما پس از ورود از اینجا مدیریت
            می‌شوند.
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
      <AccountShell active="profile">
        <div className="account-page-heading">
          <span className="section-eyebrow">حساب من</span>
          <h1>اطلاعات حساب</h1>
          <p>اطلاعات نمایشی و راه‌های ارتباطی حساب خود را مدیریت کنید.</p>
        </div>
        <form
          className="account-profile-card auth-form"
          onSubmit={save}
          noValidate
        >
          <h2>اطلاعات اصلی</h2>
          <div className="account-profile-fields">
          <label>
            نام
            <input
              name="firstName"
              defaultValue={user.firstName ?? ""}
              minLength={2}
            />
          </label>
          <label>
            نام خانوادگی
            <input
              name="lastName"
              defaultValue={user.lastName ?? ""}
              minLength={2}
            />
          </label>
          <label>
            شماره تماس
            <small>شماره تأییدشده حساب</small>
            <input
              dir="ltr"
              value={formatIranianMobile(user.mobile)}
              readOnly
            />
          </label>
          <label>
            نام‌کاربری
            <small>۳ تا ۳۰؛ حداقل یک حرف لاتین، عدد، نقطه یا زیرخط</small>
            <input
              name="username"
              dir="ltr"
              defaultValue={user.username ?? ""}
              pattern="(?=.*[A-Za-z])[A-Za-z0-9._]{3,30}"
              required
            />
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
          <label>
            رمز عبور جدید
            <small>
              حداقل ۸ و شامل حرف کوچک و بزرگ لاتین، عدد و نماد مثل @
            </small>
            <PasswordInput
              name="password"
              minLength={8}
              maxLength={72}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,72}"
              autoComplete="new-password"
            />
          </label>
          </div>
          {user.notablePerson ? (
            <p className="account-linked-person">
              ✓ این حساب به چهرهٔ «{user.notablePerson.displayName}» متصل است.
            </p>
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
            {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
          </button>
        </form>
      </AccountShell>
    </main>
  );
}
