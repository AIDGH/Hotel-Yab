import Link from "next/link";

export function BrandMark() {
  return (
    <Link className="brand" href="/" aria-label="هتل‌یاب، صفحه اصلی">
      <span className="brand-symbol" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="brand-name">هتل‌یاب</span>
    </Link>
  );
}
