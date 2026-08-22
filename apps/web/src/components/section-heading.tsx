import Link from "next/link";
import { SiteIcon } from "./site-icon";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  align?: "start" | "center";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  align = "start",
}: SectionHeadingProps) {
  return (
    <div className={`section-heading section-heading-${align}`}>
      <div>
        <span className="section-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link className="text-link" href={actionHref}>
          {actionLabel}
          <SiteIcon name="arrow-left" />
        </Link>
      ) : null}
    </div>
  );
}
