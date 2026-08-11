"use client";

import { useState } from "react";
import { useUserLibrary } from "./user-library-provider";

export function EntityLibraryActions({
  entity,
  slug,
  label,
  variant = "card",
}: {
  entity: "hotel" | "notable-person";
  slug: string;
  label: string;
  variant?: "card" | "detail";
}) {
  const { isActive, toggle } = useUserLibrary();
  const [pending, setPending] = useState<"like" | "save" | null>(null);
  const [error, setError] = useState("");
  const liked = isActive(entity, "like", slug);
  const saved = isActive(entity, "save", slug);

  async function run(action: "like" | "save") {
    setPending(action);
    setError("");
    try {
      await toggle(entity, action, slug);
    } catch {
      setError("انجام نشد");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={`entity-library-actions entity-library-actions-${variant}`}>
      <button
        type="button"
        className={liked ? "entity-library-active" : ""}
        aria-label={liked ? `حذف پسند ${label}` : `پسندیدن ${label}`}
        aria-pressed={liked}
        disabled={pending !== null}
        onClick={() => void run("like")}
      >
        <HeartIcon filled={liked} />
        {variant === "detail" ? <span>{liked ? "پسندیده" : "پسندیدن"}</span> : null}
      </button>
      <button
        type="button"
        className={saved ? "entity-library-active" : ""}
        aria-label={saved ? `حذف ${label} از ذخیره‌ها` : `ذخیره ${label}`}
        aria-pressed={saved}
        disabled={pending !== null}
        onClick={() => void run("save")}
      >
        <BookmarkIcon filled={saved} />
        {variant === "detail" ? <span>{saved ? "ذخیره‌شده" : "ذخیره"}</span> : null}
      </button>
      {error ? (
        <span className="entity-library-action-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 4.8A2.8 2.8 0 0 1 8.8 2h6.4A2.8 2.8 0 0 1 18 4.8V22l-6-3.8L6 22V4.8Z"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}
