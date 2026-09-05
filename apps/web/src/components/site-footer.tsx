"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./brand-mark";
import { SiteIcon } from "./site-icon";

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/account")) return null;

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-intro">
          <BrandMark />
          <p>
            پایگاه شفاف ارتباط هتل‌ها با آدم‌های شناخته‌شده؛ همراه مدرک،
            منبع و وضعیت بررسی.
          </p>
        </div>
        <div className="footer-links">
          <strong>کشف</strong>
          <Link href="/destinations">مقصدها</Link>
          <Link href="/hotels">هتل‌ها</Link>
          <Link href="/notable-people">چهره‌ها</Link>
          <Link href="/explore">محتواها</Link>
        </div>
        <div className="footer-links footer-contact" id="contact">
          <strong>ارتباط با ما</strong>
          <a href="tel:+989912184701" dir="ltr">
            <SiteIcon name="phone" />
            <span>0991 218 4701</span>
          </a>
          <a href="https://www.instagram.com/jaryan.hotelyab" target="_blank" rel="noreferrer noopener" dir="ltr">
            <SiteIcon name="instagram" />
            <span>@jaryan.hotelyab</span>
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© ۱۴۰۵ هتل‌یاب</span>
        <span>داده‌ی معتبر، انتخاب آگاهانه</span>
      </div>
    </footer>
  );
}
