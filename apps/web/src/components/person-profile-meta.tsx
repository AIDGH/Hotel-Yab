import { categoryLabel, formatFollowerCount } from "@/lib/labels";
import { PersonInstagramHandle } from "./person-instagram-handle";
import {
  compactPersonOccupation,
  PersonOccupation,
} from "./person-occupation";

type PersonProfileMetaProps = {
  instagramHandle: string | null;
  occupation: string | null;
  followerCount: number | null;
  primaryCategory: string;
  className?: string;
};

export function PersonProfileMeta({
  instagramHandle,
  occupation,
  followerCount,
  primaryCategory,
  className = "",
}: PersonProfileMetaProps) {
  const compactOccupation = compactPersonOccupation(
    occupation,
    categoryLabel(primaryCategory),
  );

  const displayedOccupation =
    compactOccupation ?? (!instagramHandle ? occupation : null);
  const displayedFollowerCount = formatFollowerCount(followerCount);
  const occupationLine = [
    displayedOccupation,
    displayedFollowerCount
      ? `${displayedFollowerCount} دنبال‌کننده`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!instagramHandle && !occupationLine) {
    return null;
  }

  return (
    <div className={`person-profile-meta ${className}`.trim()}>
      {occupationLine ? (
        <PersonOccupation value={occupationLine} />
      ) : null}

      {instagramHandle ? (
        <PersonInstagramHandle handle={instagramHandle} />
      ) : null}
    </div>
  );
}
