import type { ReactNode, SVGProps } from "react";

export type SiteIconName =
  | "account"
  | "activity"
  | "heart"
  | "users"
  | "administrator"
  | "moderation"
  | "catalog"
  | "profile"
  | "logout"
  | "chevron-down"
  | "menu"
  | "close"
  | "search"
  | "location"
  | "hotel"
  | "destination"
  | "video"
  | "phone"
  | "instagram"
  | "alert"
  | "check"
  | "external-link"
  | "clock"
  | "arrow-left"
  | "fullscreen"
  | "fullscreen-exit"
  | "image";

export function SiteIcon({
  name,
  className,
  ...props
}: { name: SiteIconName } & Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <svg
      aria-hidden="true"
      className={["site-icon", className].filter(Boolean).join(" ")}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {icons[name]}
    </svg>
  );
}

const icons: Record<SiteIconName, ReactNode> = {
  account: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" />
    </>
  ),
  activity: (
    <>
      <path d="M4.3 8.7A8 8 0 1 1 4 15" />
      <path d="M4 4v5h5M12 7.5V12l3 1.8" />
    </>
  ),
  heart: <path d="M20.8 5.9c-1.8-1.9-4.8-1.9-6.7 0L12 8l-2.1-2.1a4.7 4.7 0 0 0-6.7 6.7L12 21l8.8-8.4a4.7 4.7 0 0 0 0-6.7Z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.4-3.5 2.2-5.3 5.5-5.3s5.1 1.8 5.5 5.3M16 5.5a3 3 0 0 1 0 5.8M16.7 14c2.2.5 3.5 2.1 3.8 5" />
    </>
  ),
  administrator: (
    <>
      <path d="m12 3 7 3v5c0 4.6-2.6 8.1-7 10-4.4-1.9-7-5.4-7-10V6l7-3Z" />
      <circle cx="12" cy="9" r="2" />
      <path d="M8.8 15.5c.5-2 1.5-3 3.2-3s2.7 1 3.2 3" />
    </>
  ),
  moderation: (
    <>
      <path d="M4 5.5h16v13H4z" />
      <path d="m8 12 2.2 2.2L16.5 8" />
    </>
  ),
  catalog: (
    <>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 1.5 3 3.5.5-2.5 2.4.6 3.5-3.1-1.6-3.1 1.6.6-3.5L7 10.5l3.5-.5L12 7Z" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
    </>
  ),
  "chevron-down": <path d="m7 10 5 5 5-5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  location: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  hotel: (
    <>
      <path d="M4 21V5h11v16M15 10h5v11M2 21h20" />
      <path d="M8 9h3M8 13h3M8 17h3" />
    </>
  ),
  destination: (
    <>
      <path d="M4 19.5 9 17l6 2.5 5-2.5V4.5L15 7 9 4.5 4 7v12.5Z" />
      <path d="M9 4.5V17M15 7v12.5" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m10 9 5 3-5 3V9Z" />
    </>
  ),
  phone: (
    <path d="M7.2 3.8 9.8 7 8.2 9.2a15 15 0 0 0 6.6 6.6l2.2-1.6 3.2 2.6-1 3c-.3.8-1.1 1.3-2 1.2C9.5 20.2 3.8 14.5 3 6.8c-.1-.9.4-1.7 1.2-2l3-1Z" />
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  check: <path d="m5 12 4.2 4.2L19 6.5" />,
  "external-link": (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M19 13v6H5V5h6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  "arrow-left": <path d="M19 12H5M10 7l-5 5 5 5" />,
  fullscreen: <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />,
  "fullscreen-exit": <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="m5 18 5-5 3.5 3 2.5-2 3 3" />
    </>
  ),
};
