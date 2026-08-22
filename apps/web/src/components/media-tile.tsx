import { SiteIcon } from "./site-icon";

type MediaTileProps = {
  imageUrl: string | null;
  label: string;
  variant: "hotel" | "person";
};

export function MediaTile({ imageUrl, label, variant }: MediaTileProps) {
  const safeImageUrl = imageUrl?.replaceAll('"', "%22");
  const style = safeImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(17, 24, 39, 0.04), rgba(17, 24, 39, 0.28)), url("${safeImageUrl}")`,
      }
    : undefined;

  return (
    <div
      className={`media-tile media-tile-${variant} ${imageUrl ? "has-image" : ""}`}
      style={style}
      role={imageUrl ? "img" : undefined}
      aria-label={imageUrl ? label : undefined}
      aria-hidden={imageUrl ? undefined : true}
    >
      {!imageUrl ? (
        <span>{variant === "hotel" ? <SiteIcon name="hotel" /> : label.slice(0, 1)}</span>
      ) : null}
    </div>
  );
}
