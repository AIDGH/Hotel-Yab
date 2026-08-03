import { categoryLabel } from "@/lib/labels";
import { PersonInstagramHandle } from "./person-instagram-handle";
import { compactPersonOccupation, PersonOccupation } from "./person-occupation";

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

  if (!instagramHandle && !compactOccupation) {
    return null;
  }

  return (
    <div className={`person-profile-meta ${className}`.trim()}>
      {instagramHandle ? <PersonInstagramHandle handle={instagramHandle} /> : null}
      {instagramHandle && compactOccupation ? <span aria-hidden="true">·</span> : null}
      {compactOccupation ? <PersonOccupation value={compactOccupation} /> : null}
    </div>
  );
}
