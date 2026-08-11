"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { browserApi } from "@/lib/browser-api";
import { useAuth } from "./auth-provider";

export type LibraryHotel = {
  slug: string;
  name: string;
  city: string;
  imageUrl: string | null;
  logoUrl: string | null;
  starRating: number | null;
};

export type LibraryNotablePerson = {
  slug: string;
  displayName: string;
  imageUrl: string | null;
  primaryCategory: string;
  occupation: string | null;
  followerCount: number | null;
};

export type AccountLibraryData = {
  likedHotels: LibraryHotel[];
  savedHotels: LibraryHotel[];
  likedNotablePeople: LibraryNotablePerson[];
  savedNotablePeople: LibraryNotablePerson[];
};

type LibraryEntity = "hotel" | "notable-person";
type LibraryAction = "like" | "save";

type UserLibraryContextValue = {
  data: AccountLibraryData;
  loading: boolean;
  error: string;
  isActive: (
    entity: LibraryEntity,
    action: LibraryAction,
    slug: string,
  ) => boolean;
  toggle: (
    entity: LibraryEntity,
    action: LibraryAction,
    slug: string,
  ) => Promise<void>;
};

const emptyLibrary: AccountLibraryData = {
  likedHotels: [],
  savedHotels: [],
  likedNotablePeople: [],
  savedNotablePeople: [],
};

const UserLibraryContext = createContext<UserLibraryContextValue | null>(null);

export function UserLibraryProvider({ children }: { children: ReactNode }) {
  const { user, openAuth } = useAuth();
  const [data, setData] = useState<AccountLibraryData>(emptyLibrary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLibrary = useCallback(async () => {
    if (!user) {
      setData(emptyLibrary);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await browserApi<{ data: AccountLibraryData }>(
        "/account/library",
      );
      setData(result.data);
    } catch {
      setError("دریافت پسندیده‌ها و ذخیره‌ها انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadLibrary(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadLibrary]);

  function isActive(
    entity: LibraryEntity,
    action: LibraryAction,
    slug: string,
  ) {
    if (entity === "hotel") {
      const collection = action === "like" ? data.likedHotels : data.savedHotels;
      return collection.some((item) => item.slug === slug);
    }
    const collection =
      action === "like"
        ? data.likedNotablePeople
        : data.savedNotablePeople;
    return collection.some((item) => item.slug === slug);
  }

  async function toggle(
    entity: LibraryEntity,
    action: LibraryAction,
    slug: string,
  ) {
    if (!user) {
      openAuth();
      return;
    }
    const active = isActive(entity, action, slug);
    const segment = entity === "hotel" ? "hotels" : "notable-people";
    await browserApi(
      `/account/library/${segment}/${encodeURIComponent(slug)}/${action}`,
      { method: active ? "DELETE" : "PUT" },
    );
    await loadLibrary();
  }

  return (
    <UserLibraryContext.Provider
      value={{ data, loading, error, isActive, toggle }}
    >
      {children}
    </UserLibraryContext.Provider>
  );
}

export function useUserLibrary() {
  const value = useContext(UserLibraryContext);
  if (!value) {
    throw new Error("useUserLibrary must be used inside UserLibraryProvider");
  }
  return value;
}
