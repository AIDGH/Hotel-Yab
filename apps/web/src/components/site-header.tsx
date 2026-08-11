"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { BrandMark } from "./brand-mark";

const navigation = [
  { href: "/destinations", label: "مقصدها" },
  { href: "/hotels", label: "هتل‌ها" },
  { href: "/notable-people", label: "چهره‌ها" },
  { href: "/explore", label: "ویدیوها" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, openAuth, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <BrandMark />

        <nav
          className={`main-nav${mobileOpen ? " main-nav-open" : ""}`}
          aria-label="ناوبری اصلی"
        >
          {navigation.map((item) => (
            <Link
              className={
                pathname.startsWith(item.href) ? "nav-active" : undefined
              }
              href={item.href}
              key={item.href}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/#how-it-works" onClick={() => setMobileOpen(false)}>
            روش راستی‌آزمایی
          </Link>
        </nav>

        <div className="header-account">
          {loading ? (
            <span className="account-loading" aria-label="در حال بررسی حساب" />
          ) : user ? (
            <div className="account-menu-wrap">
              <button
                className="account-trigger"
                type="button"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((value) => !value)}
              >
                <span className="account-avatar">
                  {(user.firstName ?? "ک").slice(0, 1)}
                </span>
                <span>{user.displayName ?? "حساب من"}</span>
                <small>⌄</small>
              </button>
              {accountOpen ? (
                <div className="account-dropdown">
                  <Link href="/account" onClick={() => setAccountOpen(false)}>
                    حساب من
                  </Link>
                  <Link
                    href="/account/activity"
                    onClick={() => setAccountOpen(false)}
                  >
                    فعالیت‌های من
                  </Link>
                  {user.role === "ADMIN" || user.role === "MODERATOR" ? (
                    <Link
                      href="/admin/moderation"
                      onClick={() => setAccountOpen(false)}
                    >
                      پنل مدیریت
                    </Link>
                  ) : null}
                  {user.notablePerson ? (
                    <Link href={`/notable-people/${user.notablePerson.slug}`}>
                      پروفایل چهرهٔ من
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      void logout();
                    }}
                  >
                    خروج
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              className="button button-small account-login-button"
              type="button"
              onClick={openAuth}
            >
              <span aria-hidden="true">♙</span>
              ورود یا عضویت
            </button>
          )}
        </div>

        <button
          className="mobile-menu-button"
          type="button"
          aria-label="نمایش منو"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
