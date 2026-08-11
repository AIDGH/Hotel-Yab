import { getTravelVideos } from "@/lib/api";
import type { Destination, TravelVideo as ApiTravelVideo } from "@/lib/types";

export type TravelVideo = Omit<ApiTravelVideo, "id" | "destinations" | "hotels"> & {
  videoId: string;
};

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

function resolveDestination(destination: Destination): ResolvedTravelDestination {
  const routeType = destination.type === "CITY" ? "cities" : "provinces";
  return {
    destinationType: destination.type,
    routeType,
    slug: destination.slug,
    name: destination.name,
    href: `/destinations/${routeType}/${destination.slug}`,
  };
}

export async function getAllTravelVideos(): Promise<PersonTravelVideo[]> {
  const result = await getTravelVideos();
  if (!result.ok) return [];

  return result.value.data.map(({ id, destinations, hotels, ...video }) => {
    void hotels;
    return {
      video: { ...video, videoId: id },
      destinations: destinations.map(resolveDestination),
    };
  });
}

export async function getTravelVideosForDestination(
  destinationType: "CITY" | "PROVINCE",
  destinationSlug: string,
): Promise<TravelVideo[]> {
  const videos = await getAllTravelVideos();
  return videos
    .filter(({ destinations }) =>
      destinations.some(
        (destination) =>
          destination.destinationType === destinationType &&
          destination.slug === destinationSlug,
      ),
    )
    .map(({ video }) => video);
}

export async function getTravelVideosForInstagramUsername(
  instagramUsername: string | null,
): Promise<PersonTravelVideo[]> {
  if (!instagramUsername) return [];
  const normalizedUsername = normalizeInstagramUsername(instagramUsername);
  return (await getAllTravelVideos()).filter(
    ({ video }) =>
      normalizeInstagramUsername(video.instagramUsername) === normalizedUsername,
  );
}
