import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { PersonCard } from "@/components/person-card";
import { getNotablePeople } from "@/lib/api";
import { notableCategories } from "@/lib/labels";

export const metadata: Metadata = {
  title: "کشف چهره‌ها",
  description: "چهره‌ها و هتل‌هایی که ارتباط مستند با آن‌ها دارند.",
};

export const dynamic = "force-dynamic";

type PeoplePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const params = await searchParams;
  const query = readParam(params.query);
  const category = readParam(params.category);
  const result = await getNotablePeople({ query, category, pageSize: 24 });

  return (
    <main className="listing-page">
      <section className="page-hero page-hero-compact page-hero-people">
        <div className="container">
          <span className="eyebrow">چهره‌های منبع‌دار</span>
          <h1>از آدم‌های مورد علاقه‌تان به هتل برسید</h1>
          <p>
            پروفایل هر فرد فقط با رابطه‌های تأییدشده و منابع قابل مشاهده
            نمایش داده می‌شود.
          </p>
          <form className="filter-bar" method="get">
            <label>
              <span>نام یا حرفه</span>
              <input name="query" defaultValue={query} placeholder="نام چهره را بنویسید" />
            </label>
            <label>
              <span>دسته‌بندی</span>
              <select name="category" defaultValue={category}>
                <option value="">همه دسته‌ها</option>
                {notableCategories.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">
              اعمال فیلتر
            </button>
          </form>
        </div>
      </section>

      <section className="section container listing-results">
        <div className="results-header">
          <div>
            <span className="section-eyebrow">نتایج جست‌وجو</span>
            <h2>چهره‌های قابل نمایش</h2>
          </div>
          {result.ok ? (
            <span>{result.value.meta.total.toLocaleString("fa-IR")} نتیجه</span>
          ) : null}
        </div>

        {result.ok && result.value.data.length > 0 ? (
          <div className="people-grid">
            {result.value.data.map((person) => (
              <PersonCard person={person} key={person.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            kind={result.ok ? "empty" : "unavailable"}
            title={result.ok ? "چهره‌ای با این فیلتر پیدا نشد" : "API در دسترس نیست"}
            description={
              result.ok
                ? "فیلتر را تغییر دهید یا بعد از تکمیل راستی‌آزمایی داده‌ها دوباره سر بزنید."
                : "برای نمایش داده‌ها، ابتدا بک‌اند را با pnpm api:dev اجرا کنید."
            }
          />
        )}
      </section>
    </main>
  );
}
