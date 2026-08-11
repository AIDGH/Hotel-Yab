import destinations from "@/data/destinations.json";
import travelVideoData from "@/data/travel-videos.json";

export type TravelVideo = (typeof travelVideoData.videos)[number];

export type ResolvedTravelDestination = {
  destinationType: "CITY" | "PROVINCE";
  routeType: "cities" | "provinces";
  slug: string;
  name: string;
  href: string;
};

export type PersonTravelVideo = {
  video: TravelVideo;
  destinations: ResolvedTravelDestination[];
};

function normalizeInstagramUsername(value: string): string {
  return value.trim().replace(/^@/, "").toLocaleLowerCase("en-US");
}

function resolveDestination(
  link: (typeof travelVideoData.videoDestinations)[number],
): ResolvedTravelDestination | null {
  if (link.destinationType === "CITY") {
    const destination = destinations.cities.find(
      (item) => item.slug === link.destinationSlug,
    );

    return destination
      ? {
          destinationType: "CITY",
          routeType: "cities",
          slug: destination.slug,
          name: destination.name,
          href: `/destinations/cities/${destination.slug}`,
        }
      : null;
  }

  if (link.destinationType === "PROVINCE") {
    const destination = destinations.provinces.find(
      (item) => item.slug === link.destinationSlug,
    );

    return destination
      ? {
          destinationType: "PROVINCE",
          routeType: "provinces",
          slug: destination.slug,
          name: destination.name,
          href: `/destinations/provinces/${destination.slug}`,
        }
      : null;
  }

  return null;
}

function resolveVideoDestinations(
  videoId: string,
): ResolvedTravelDestination[] {
  return travelVideoData.videoDestinations
    .filter((item) => item.videoId === videoId)
    .map(resolveDestination)
    .filter(
      (destination): destination is ResolvedTravelDestination =>
        destination !== null,
    );
}

export function getAllTravelVideos(): PersonTravelVideo[] {
  return travelVideoData.videos.map((video) => ({
    video,
    destinations: resolveVideoDestinations(video.videoId),
  }));
}

export function getTravelVideosForDestination(
  destinationType: "CITY" | "PROVINCE",
  destinationSlug: string,
): TravelVideo[] {
  const matchingVideoIds = new Set(
    travelVideoData.videoDestinations
      .filter(
        (item) =>
          item.destinationType === destinationType &&
          item.destinationSlug === destinationSlug,
      )
      .map((item) => item.videoId),
  );

  return travelVideoData.videos.filter((video) =>
    matchingVideoIds.has(video.videoId),
  );
}

export function getTravelVideosForInstagramUsername(
  instagramUsername: string | null,
): PersonTravelVideo[] {
  if (!instagramUsername) return [];

  const normalizedUsername = normalizeInstagramUsername(instagramUsername);

  return getAllTravelVideos()
    .filter(
      ({ video }) =>
        normalizeInstagramUsername(video.instagramUsername) ===
        normalizedUsername,
    );
}
