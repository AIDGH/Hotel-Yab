"use client";

import { AccountActivity } from "@/components/account-activity";
import { AccountShell } from "@/components/account-shell";
import { useAuth } from "@/components/auth-provider";

export default function AccountActivityPage() {
  const { user, loading, openAuth } = useAuth();

  if (loading) {
    return (
      <main className="section container account-page account-activity-page">
        <p>در حال بارگذاری فعالیت‌ها…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="section container account-page account-activity-page">
        <section className="account-guest-card">
          <span className="section-eyebrow">فعالیت‌های من</span>
          <h1>برای دیدن فعالیت‌ها وارد شوید</h1>
          <p>
            نظرهای هتل و دیدگاه‌های ویدیوی شما پس از ورود از این بخش مدیریت
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
    <main className="section container account-page account-activity-page">
      <AccountShell active="activity">
        <AccountActivity />
      </AccountShell>
    </main>
  );
}
