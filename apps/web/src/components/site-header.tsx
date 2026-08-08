import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <BrandMark />
        <nav className="main-nav" aria-label="ناوبری اصلی">
          <Link href="/destinations">مقصدها</Link>
          <Link href="/hotels">هتل‌ها</Link>
          <Link href="/notable-people">چهره‌ها</Link>
          <Link href="/#how-it-works">روش راستی‌آزمایی</Link>
        </nav>
        <Link className="button button-small" href="/hotels">
          شروع جست‌وجو
        </Link>
      </div>
    </header>
  );
}
