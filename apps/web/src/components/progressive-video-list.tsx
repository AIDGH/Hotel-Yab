"use client";

import { Children, type ReactNode, useId, useState } from "react";

const VIDEO_BATCH_SIZE = 6;

export function ProgressiveVideoList({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  const [visibleCount, setVisibleCount] = useState(VIDEO_BATCH_SIZE);
  const listId = `video-list-${useId().replaceAll(":", "")}`;
  const visibleItems = items.slice(0, visibleCount);
  const remainingCount = Math.max(0, items.length - visibleItems.length);

  return (
    <>
      <div className={className} id={listId} aria-live="polite">
        {visibleItems}
      </div>
      {remainingCount > 0 ? (
        <div className="video-load-more">
          <button
            className="button pagination-secondary"
            type="button"
            aria-controls={listId}
            onClick={() =>
              setVisibleCount((currentCount) =>
                Math.min(currentCount + VIDEO_BATCH_SIZE, items.length),
              )
            }
          >
            نمایش {Math.min(VIDEO_BATCH_SIZE, remainingCount).toLocaleString("fa-IR")} ویدیوی دیگر
          </button>
          <span>
            {visibleItems.length.toLocaleString("fa-IR")} از{" "}
            {items.length.toLocaleString("fa-IR")}
          </span>
        </div>
      ) : null}
    </>
  );
}
