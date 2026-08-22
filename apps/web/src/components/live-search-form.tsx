"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteIcon } from "./site-icon";

export function LiveSearchForm({
  initialQuery = "",
  variant,
}: {
  initialQuery?: string;
  variant: "hero" | "results";
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const lastNavigation = useRef(initialQuery.trim());

  useEffect(() => {
    const normalized = query.trim();
    if (normalized === lastNavigation.current) return;
    if (normalized.length === 1) return;

    const timeout = window.setTimeout(() => {
      lastNavigation.current = normalized;
      const href = normalized
        ? `/search?query=${encodeURIComponent(normalized)}`
        : "/search";
      router.replace(href, { scroll: variant === "hero" });
    }, 380);
    return () => window.clearTimeout(timeout);
  }, [query, router, variant]);

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
            value={query}
            placeholder="مثلاً تهران، هتل عباسی یا نام یک چهره"
            autoFocus
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      )}
      {variant === "hero" ? (
        <input
          id="hero-query"
          name="query"
          value={query}
          placeholder="نام هتل، چهره، شهر یا استان..."
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}
      <button className={variant === "results" ? "button" : undefined} type="submit">
        جست‌وجو
      </button>
    </form>
  );
}
