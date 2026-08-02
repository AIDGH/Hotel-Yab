import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found container">
      <span>۴۰۴</span>
      <h1>این صفحه پیدا نشد</h1>
      <p>ممکن است رکورد هنوز عمومی نشده باشد یا آدرس آن تغییر کرده باشد.</p>
      <Link className="button" href="/">
        بازگشت به خانه
      </Link>
    </main>
  );
}
