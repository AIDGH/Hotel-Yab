import { categoryLabel } from "@/lib/labels";
import { PersonInstagramHandle } from "./person-instagram-handle";
import {
  compactPersonOccupation,
  PersonOccupation,
} from "./person-occupation";

type PersonProfileMetaProps = {
  instagramHandle: string | null;
  occupation: string | null;
  primaryCategory: string;
  className?: string;
};

export function PersonProfileMeta({
  instagramHandle,
  occupation,
  primaryCategory,
  className = "",
}: PersonProfileMetaProps) {
  const compactOccupation = compactPersonOccupation(
    occupation,
    categoryLabel(primaryCategory),
  );

  const displayedOccupation =
    compactOccupation ?? (!instagramHandle ? occupation : null);

  if (!instagramHandle && !displayedOccupation) {
    return null;
  }

  return (
    <div className={`person-profile-meta ${className}`.trim()}>
      {displayedOccupation ? ( 
        <PersonOccupation value={displayedOccupation} />
      ) : null}

      {instagramHandle ? (
        <PersonInstagramHandle handle={instagramHandle} />
      ) : null}
    </div>
  );
}