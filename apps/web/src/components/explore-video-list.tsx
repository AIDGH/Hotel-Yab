import type {
  ResolvedTravelDestination,
  TravelVideo,
} from "@/lib/travel-videos";
import type { NotablePersonListItem } from "@/lib/types";
import { ExploreReels } from "./mobile-explore-reels";

type ExploreVideoItem = {
  video: TravelVideo;
  destinations: ResolvedTravelDestination[];
  person: NotablePersonListItem | null;
};

export function ExploreVideoList({ items }: { items: ExploreVideoItem[] }) {
  return (
    <>
      <ExploreReels items={items} variant="desktop" />
      <ExploreReels items={items} variant="mobile" />
    </>
  );
}
