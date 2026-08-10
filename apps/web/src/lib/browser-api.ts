export const BROWSER_API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

export async function browserApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BROWSER_API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join("، ")
      : payload?.message;
    throw new Error(message ?? `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
