"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useAuth } from "./auth-provider";
import { BrandMark } from "./brand-mark";
import { SiteIcon, type SiteIconName } from "./site-icon";

const navigation: Array<{ href: string; label: string; icon: SiteIconName }> = [
  { href: "/destinations", label: "مقصدها", icon: "destination" },
  { href: "/hotels", label: "هتل‌ها", icon: "hotel" },
  { href: "/notable-people", label: "چهره‌ها", icon: "users" },
  { href: "/explore", label: "محتواها", icon: "video" },
];

type OpenPanel = "navigation" | "account" | null;
type VisiblePanel = Exclude<OpenPanel, null>;

export function SiteHeader() {
  const pathname = usePathname();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [closingPanel, setClosingPanel] = useState<OpenPanel>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const showPanel = useCallback((panel: VisiblePanel) => {
    clearCloseTimer();
    setClosingPanel(null);
    setOpenPanel(panel);
  }, [clearCloseTimer]);

  const closePanels = useCallback(() => {
    if (!openPanel) return;
    const panel = openPanel;
    clearCloseTimer();
    setOpenPanel(null);
    setClosingPanel(panel);
    closeTimerRef.current = setTimeout(() => {
      setClosingPanel(null);
      closeTimerRef.current = null;
    }, 260);
  }, [clearCloseTimer, openPanel]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (openPanel === "account" && !accountRef.current?.contains(event.target as Node)) {
        closePanels();
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closePanels();
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closePanels, openPanel]);

  useEffect(() => {
    if ((!openPanel && !closingPanel) || !window.matchMedia("(max-width: 760px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [closingPanel, openPanel]);

  const visiblePanel = openPanel ?? closingPanel;

  return (
    <header
      className={`site-header${visiblePanel ? " has-open-panel" : ""}`}
      data-open-panel={visiblePanel ?? undefined}
      data-panel-state={closingPanel ? "closing" : openPanel ? "open" : undefined}
    >
      <div className="container header-inner">
        <BrandMark />
        <nav
          className={`main-nav${openPanel === "navigation" ? " main-nav-open" : ""}${closingPanel === "navigation" ? " main-nav-closing" : ""}`}
          aria-label="ناوبری اصلی"
        >
          <div className="mobile-drawer-heading">
            <strong>منوی هتل‌یاب</strong>
            <button type="button" aria-label="بستن منو" onClick={closePanels}>
              <SiteIcon name="close" />
            </button>
          </div>
          {navigation.map((item) => (
            <Link
              className={pathname.startsWith(item.href) ? "nav-active" : undefined}
              href={item.href}
              key={item.href}
              onClick={closePanels}
            >
              <SiteIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
          <Link href="/#contact" onClick={closePanels}>
            <SiteIcon name="phone" />
            <span>ارتباط با ما</span>
          </Link>
        </nav>
        <HeaderAccount
          accountRef={accountRef}
          open={openPanel === "account"}
          closing={closingPanel === "account"}
          onToggle={() => openPanel === "account" ? closePanels() : showPanel("account")}
          onClose={closePanels}
        />
        <button
          className={`mobile-menu-button${openPanel === "navigation" ? " is-open" : ""}`}
          type="button"
          aria-label={openPanel === "navigation" ? "بستن منو" : "نمایش منو"}
          aria-expanded={openPanel === "navigation"}
          onClick={() => openPanel === "navigation" ? closePanels() : showPanel("navigation")}
        >
          <SiteIcon name={openPanel === "navigation" ? "close" : "menu"} />
        </button>
      </div>
      {visiblePanel ? (
        <button className={`header-panel-backdrop${closingPanel ? " is-closing" : ""}`} type="button" aria-label="بستن منو" onClick={closePanels} />
      ) : null}
    </header>
  );
}

function HeaderAccount({
  accountRef,
  open,
  closing,
  onToggle,
  onClose,
}: {
  accountRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  closing: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { user, loading, openAuth, logout } = useAuth();

  return (
    <div className="header-account" ref={accountRef}>
      {loading ? (
        <span className="account-loading" aria-label="در حال بررسی حساب" />
      ) : user ? (
        <div className="account-menu-wrap">
          <button className="account-trigger" type="button" aria-expanded={open} onClick={onToggle}>
            <span className="account-avatar">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt="" width={36} height={36} unoptimized />
              ) : (
                (user.firstName ?? user.username ?? "ک").slice(0, 1)
              )}
            </span>
            <span>{user.displayName ?? "حساب من"}</span>
            <SiteIcon className={`account-trigger-chevron${open ? " is-open" : ""}`} name="chevron-down" />
          </button>
          {open || closing ? (
            <div className={`account-dropdown${closing ? " is-closing" : ""}`}>
              <div className="mobile-drawer-heading account-drawer-heading">
                <div className="account-drawer-identity">
                  <span className="account-avatar">
                    {user.avatarUrl ? (
                      <Image src={user.avatarUrl} alt="" width={36} height={36} unoptimized />
                    ) : (
                      (user.firstName ?? user.username ?? "ک").slice(0, 1)
                    )}
                  </span>
                  <strong>{user.displayName ?? "حساب من"}</strong>
                </div>
                <button type="button" aria-label="بستن منوی حساب" onClick={onClose}>
                  <SiteIcon name="close" />
                </button>
              </div>
              <AccountMenuLink href="/account" icon="account" onClose={onClose}>حساب من</AccountMenuLink>
              <AccountMenuLink href="/account/library" icon="heart" onClose={onClose}>پسندیده‌ها و ذخیره‌ها</AccountMenuLink>
              <AccountMenuLink href="/account/activity" icon="activity" onClose={onClose}>فعالیت‌های من</AccountMenuLink>
              {user.role === "ADMIN" || user.role === "MODERATOR" ? (
                <AccountMenuLink href="/admin/users" icon="users" onClose={onClose}>مدیریت کاربران</AccountMenuLink>
              ) : null}
              {user.role === "MODERATOR" ? (
                <AccountMenuLink href="/admin/administrators" icon="administrator" onClose={onClose}>بررسی مدیران</AccountMenuLink>
              ) : null}
              {user.role === "ADMIN" || user.role === "MODERATOR" ? (
                <AccountMenuLink href="/admin/moderation" icon="moderation" onClose={onClose}>بررسی محتوا</AccountMenuLink>
              ) : null}
              {user.role === "ADMIN" || user.role === "MODERATOR" ? (
                <AccountMenuLink href="/admin/catalog" icon="catalog" onClose={onClose}>مدیریت داده‌ها</AccountMenuLink>
              ) : null}
              {user.notablePerson ? (
                <AccountMenuLink href={`/notable-people/${user.notablePerson.slug}`} icon="profile" onClose={onClose}>پروفایل چهرهٔ من</AccountMenuLink>
              ) : null}
              <button className="account-menu-logout" type="button" onClick={() => { onClose(); void logout(); }}>
                <SiteIcon name="logout" />
                <span>خروج</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <button className="button button-small account-login-button" type="button" onClick={openAuth}>
          ورود یا عضویت
        </button>
      )}
    </div>
  );
}

function AccountMenuLink({ href, icon, onClose, children }: {
  href: string;
  icon: SiteIconName;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Link href={href} onClick={onClose}>
      <SiteIcon name={icon} />
      <span>{children}</span>
    </Link>
  );
}
