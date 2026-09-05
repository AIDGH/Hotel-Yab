"use client";

import { useEffect, useState } from "react";

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
  const [variant, setVariant] = useState<"desktop" | "mobile" | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const updateVariant = () =>
      setVariant(media.matches ? "mobile" : "desktop");

    updateVariant();
    media.addEventListener("change", updateVariant);
    return () => media.removeEventListener("change", updateVariant);
  }, []);

  if (!variant) return null;

  return <ExploreReels items={items} variant={variant} key={variant} />;
}
