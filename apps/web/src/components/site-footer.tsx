import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function SiteFooter() {
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
          <Link href="/hotels">هتل‌ها</Link>
          <Link href="/notable-people">چهره‌ها</Link>
        </div>
        <div className="footer-links">
          <strong>شفافیت</strong>
          <Link href="/#how-it-works">روش راستی‌آزمایی</Link>
          <span>گزارش اطلاعات نادرست — به‌زودی</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© ۱۴۰۵ هتل‌یاب</span>
        <span>داده‌ی معتبر، انتخاب آگاهانه</span>
      </div>
    </footer>
  );
}
