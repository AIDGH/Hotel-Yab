import Link from "next/link";

type DestinationCardProps = {
  name: string;
  href: string;
  subtitle: string;
  imageUrl: string;
  description: string | null;
};

export function DestinationCard({
  name,
  href,
  subtitle,
  imageUrl,
  description,
}: DestinationCardProps) {
  return (
    <article className="destination-card">
      <Link href={href}>
        <div
          className="destination-card-media"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />

        <div className="destination-card-body">
          <span>{subtitle}</span>
          <h3>{name}</h3>

          {description && <p>{description}</p>}
        </div>
      </Link>
    </article>
  );
}