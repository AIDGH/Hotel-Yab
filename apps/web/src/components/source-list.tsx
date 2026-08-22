import { formatDate, sourceLabel } from "@/lib/labels";
import type { EvidenceSource } from "@/lib/types";
import { SiteIcon } from "./site-icon";

export function SourceList({ sources }: { sources: EvidenceSource[] }) {
  if (sources.length === 0) {
    return (
      <div className="evidence-placeholder">
        <span className="source-icon">
          <SiteIcon name="video" />
        </span>
        <span>
          <strong>جای عکس، ویدئو یا لینک منبع</strong>
          <small>رسانه و منبع این ارتباط بعداً اضافه می‌شود.</small>
        </span>
      </div>
    );
  }

  return (
    <div className="source-list">
      {sources.map((source) => {
        const isMedia = source.type === "VIDEO" || source.type === "SOCIAL_MEDIA_POST";
        const publishedAt = formatDate(source.publishedAt);

        return (
          <a
            className={`source-card ${isMedia ? "source-card-media" : ""}`}
            href={source.url}
            target="_blank"
            rel="noreferrer noopener"
            key={source.id}
          >
            <span className="source-icon">
              <SiteIcon name={isMedia ? "video" : "external-link"} />
            </span>
            <span className="source-copy">
              <span className="source-type">
                {sourceLabel(source.type)}
                {source.isPrimary ? <em>منبع اصلی</em> : null}
              </span>
              <strong>{source.title}</strong>
              <small>
                {[source.publisher, publishedAt].filter(Boolean).join(" · ") ||
                  "مشاهده منبع اصلی"}
              </small>
            </span>
            <span className="source-action">{isMedia ? "مشاهده مدرک" : "باز کردن"}</span>
          </a>
        );
      })}
    </div>
  );
}
