import type {
  ApiEnvelope,
  ApiResult,
  HotelDetail,
  HotelListItem,
  NotablePersonDetail,
  NotablePersonListItem,
  PaginatedResponse,
  Destination,
  TravelVideo,
} from "./types";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

type QueryValue = string | number | undefined;

async function request<T>(path: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: `API request failed with status ${response.status}`,
      };
    }

    return { ok: true, value: (await response.json()) as T };
  } catch {
    return {
      ok: false,
      message: "The Hotel-Yab API is not reachable.",
    };
  }
}

function toQueryString(values: Record<string, QueryValue>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getHotels(
  query: Record<string, QueryValue> = {},
): Promise<ApiResult<PaginatedResponse<HotelListItem>>> {
  return request(`/hotels${toQueryString(query)}`);
}

export function getHotel(
  slug: string,
): Promise<ApiResult<ApiEnvelope<HotelDetail>>> {
  return request(`/hotels/${encodeURIComponent(slug)}`);
}

export function getNotablePeople(
  query: Record<string, QueryValue> = {},
): Promise<ApiResult<PaginatedResponse<NotablePersonListItem>>> {
  return request(`/notable-people${toQueryString(query)}`);
}

export async function getNotablePersonByInstagramUsername(
  instagramUsername: string,
): Promise<NotablePersonListItem | null> {
  const normalizedUsername = instagramUsername
    .trim()
    .replace(/^@/, "")
    .toLocaleLowerCase("en-US");
  const result = await getNotablePeople({
    query: normalizedUsername,
    pageSize: 100,
  });

  if (!result.ok) return null;

  return (
    result.value.data.find(
      (person) =>
        person.instagramHandle?.toLocaleLowerCase("en-US") ===
        normalizedUsername,
    ) ?? null
  );
}

export function getNotablePerson(
  slug: string,
): Promise<ApiResult<ApiEnvelope<NotablePersonDetail>>> {
  return request(`/notable-people/${encodeURIComponent(slug)}`);
}

export function getDestinations(): Promise<
  ApiResult<ApiEnvelope<Destination[]>>
> {
  return request("/destinations");
}

export function getDestination(
  type: "cities" | "provinces",
  slug: string,
): Promise<ApiResult<ApiEnvelope<Destination>>> {
  return request(
    `/destinations/${type}/${encodeURIComponent(slug)}`,
  );
}

export function getTravelVideos(): Promise<
  ApiResult<ApiEnvelope<TravelVideo[]>>
> {
  return request("/travel-videos");
}
