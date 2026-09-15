import Link from "next/link";
import Image from "next/image";

export function BrandMark() {
  return (
    <Link className="brand" href="/" aria-label="هتل‌یاب، صفحه اصلی">
      <span className="brand-symbol" aria-hidden="true">
        <Image src="/brand/hotelyab.svg" width={34} height={34} alt="" unoptimized />
      </span>
      <span className="brand-name">هتل‌یاب</span>
    </Link>
  );
}
