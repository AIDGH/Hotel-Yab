import { SiteIcon } from "./site-icon";

export function LiveSearchForm({
  initialQuery = "",
  variant,
}: {
  initialQuery?: string;
  variant: "hero" | "results";
}) {
  return (
    <form
      className={variant === "hero" ? "hero-search" : "filter-bar global-search-bar"}
      action="/search"
      method="get"
    >
      {variant === "hero" ? (
        <>
          <label className="sr-only" htmlFor="hero-query">
            جست‌وجوی هتل، شهر یا چهره
          </label>
          <SiteIcon className="search-icon" name="search" />
        </>
      ) : (
        <label>
          <span>عبارت جست‌وجو</span>
          <input
            name="query"
            defaultValue={initialQuery}
            placeholder="مثلاً تهران، هتل عباسی یا نام یک چهره"
            autoFocus
            autoComplete="off"
          />
        </label>
      )}
      {variant === "hero" ? (
        <input
          id="hero-query"
          name="query"
          defaultValue={initialQuery}
          placeholder="نام هتل، چهره، شهر یا استان..."
          autoComplete="off"
        />
      ) : null}
      <button className={variant === "results" ? "button" : undefined} type="submit">
        جست‌وجو
      </button>
    </form>
  );
}
