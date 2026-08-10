import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PersonCard } from "@/components/person-card";
import { getNotablePeople } from "@/lib/api";
import { notableCategories } from "@/lib/labels";
import { AutoSubmitSelect } from "@/components/auto-submit-select";

export const metadata: Metadata = {
  title: "کشف چهره‌ها",
  description: "چهره‌ها، هتل‌های مرتبط و وضعیت بررسی هر رابطه.",
};

export const dynamic = "force-dynamic";

type PeoplePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function readPage(value: string | string[] | undefined): number {
  const page = Number.parseInt(readParam(value), 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function createPeoplePageHref({
  query,
  category,
  sort,
  page,
}: {
  query: string;
  category: string;
  sort: string;
  page: number;
}): string {
  const params = new URLSearchParams();

  if (query) params.set("query", query);
  if (category) params.set("category", category);
  if (sort && sort !== "FOLLOWERS_DESC") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search ? `/notable-people?${search}` : "/notable-people";
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const params = await searchParams;
  const query = readParam(params.query);
  const category = readParam(params.category);
  const sort = readParam(params.sort) || "FOLLOWERS_DESC";
  const page = readPage(params.page);
  const result = await getNotablePeople({
    query,
    category,
    sort,
    page,
    pageSize: 24,
  });

  return (
    <main className="listing-page">
      <section className="page-hero page-hero-compact page-hero-people">
        <div className="container">
          <span className="eyebrow">فهرست چهره‌ها</span>
          <h1>از آدم‌های مورد علاقه‌تان به هتل برسید</h1>
          <p>
            پروفایل‌های در حال تکمیل هم نمایش داده می‌شوند؛ وضعیت تأیید و
            منابع هر رابطه به‌صورت شفاف مشخص است.
          </p>
          <form className="filter-bar filter-bar-four" method="get">
            <label>
              <span>نام یا حرفه</span>
              <input name="query" defaultValue={query} placeholder="نام چهره را بنویسید" />
            </label>
            <label>
              <span>دسته‌بندی</span>
              <AutoSubmitSelect name="category" defaultValue={category}>
                <option value="">همه دسته‌ها</option>
                {notableCategories.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
            <label>
              <span>مرتب‌سازی</span>
              <AutoSubmitSelect name="sort" defaultValue={sort}>
                <option value="FOLLOWERS_DESC">بیشترین دنبال‌کننده</option>
                <option value="NAME_ASC">الفبا</option>
                <option value="HOTEL_COUNT_DESC">بیشترین هتل مرتبط</option>
              </AutoSubmitSelect>
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
          <>
            <div className="people-grid">
              {result.value.data.map((person) => (
                <PersonCard person={person} key={person.id} />
              ))}
            </div>
            {result.value.meta.totalPages > 1 ? (
              <nav className="pagination" aria-label="صفحه‌بندی چهره‌ها">
                {page > 1 ? (
                  <Link
                    className="button pagination-secondary"
                    href={createPeoplePageHref({
                      query,
                      category,
                      sort,
                      page: page - 1,
                    })}
                  >
                    صفحه قبل
                  </Link>
                ) : (
                  <span aria-hidden="true" />
                )}
                <span>
                  صفحه {page.toLocaleString("fa-IR")} از{" "}
                  {result.value.meta.totalPages.toLocaleString("fa-IR")}
                </span>
                {page < result.value.meta.totalPages ? (
                  <Link
                    className="button pagination-secondary"
                    href={createPeoplePageHref({
                      query,
                      category,
                      sort,
                      page: page + 1,
                    })}
                  >
                    {/*نمایش ۲۴ چهره بعدی */}
                    صفحه بعد
                  </Link>
                ) : (
                  <span aria-hidden="true" />
                )}
              </nav>
            ) : null}
          </>
        ) : (
          <EmptyState
            kind={result.ok ? "empty" : "unavailable"}
            title={result.ok ? "چهره‌ای با این فیلتر پیدا نشد" : "API در دسترس نیست"}
            description={
              result.ok
                ? "فیلتر را تغییر دهید و دوباره جست‌وجو کنید."
                : "برای نمایش داده‌ها، ابتدا بک‌اند را با pnpm api:dev اجرا کنید."
            }
          />
        )}
      </section>
    </main>
  );
}
