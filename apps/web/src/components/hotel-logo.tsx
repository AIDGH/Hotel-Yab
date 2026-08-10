type HotelLogoProps = {
  logoUrl: string;
  hotelName: string;
  placement: "card" | "detail";
};

export function HotelLogo({
  logoUrl,
  hotelName,
  placement,
}: HotelLogoProps) {
  const safeLogoUrl = logoUrl.replaceAll('"', "%22");

  return (
    <div
      className={`hotel-logo hotel-logo-${placement}`}
      style={{ backgroundImage: `url("${safeLogoUrl}")` }}
      role="img"
      aria-label={`لوگوی ${hotelName}`}
    />
  );
}
