import Link from "next/link";
import { categoryLabel } from "@/lib/labels";
import type { NotablePersonListItem } from "@/lib/types";
import { MediaTile } from "./media-tile";

export function PersonCard({ person }: { person: NotablePersonListItem }) {
  return (
    <article className="person-card">
      <Link href={`/notable-people/${person.slug}`}>
        <MediaTile
          imageUrl={person.imageUrl}
          label={person.displayName}
          variant="person"
        />
        <div className="person-card-copy">
          <span>{categoryLabel(person.primaryCategory)}</span>
          <h3>{person.displayName}</h3>
          <p>{person.occupation ?? "چهره شناخته‌شده"}</p>
          <div className="card-meta">
            <span>{person.associationCount.toLocaleString("fa-IR")} هتل مرتبط</span>
            <strong aria-hidden="true">←</strong>
          </div>
        </div>
      </Link>
    </article>
  );
}
