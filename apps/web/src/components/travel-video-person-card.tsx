import Link from "next/link";

import type { NotablePersonListItem } from "@/lib/types";
import { MediaTile } from "./media-tile";
import { PersonDisplayName } from "./person-display-name";
import { PersonInstagramHandle } from "./person-instagram-handle";
import { PersonProfileMeta } from "./person-profile-meta";

type TravelVideoPersonCardProps = {
  instagramUsername: string;
  person: Pick<
    NotablePersonListItem,
    | "slug"
    | "displayName"
    | "instagramHandle"
    | "primaryCategory"
    | "occupation"
    | "followerCount"
    | "imageUrl"
  > | null;
};

export function TravelVideoPersonCard({
  instagramUsername,
  person,
}: TravelVideoPersonCardProps) {
  if (!person) {
    return (
      <aside className="video-person-card video-person-card-unresolved">
        <span>سازنده ویدیو</span>
        <PersonInstagramHandle handle={instagramUsername} />
      </aside>
    );
  }

  return (
    <aside className="video-person-card">
      <Link href={`/notable-people/${person.slug}`}>
        <div className="video-person-avatar">
          <MediaTile
            imageUrl={person.imageUrl}
            label={person.displayName}
            variant="person"
          />
        </div>
        <div className="video-person-copy">
          <span>سازنده ویدیو</span>
          <h3>
            <PersonDisplayName name={person.displayName} />
          </h3>
          <PersonProfileMeta
            instagramHandle={person.instagramHandle}
            occupation={person.occupation}
            followerCount={person.followerCount}
            primaryCategory={person.primaryCategory}
          />
        </div>
      </Link>
    </aside>
  );
}
