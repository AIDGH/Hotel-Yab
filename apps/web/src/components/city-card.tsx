import Link from "next/link";

type CityCardProps = {
  name: string;
  slug: string;
  province: string;
  imageUrl: string;
  description: string | null;
};

export function CityCard({
  name,
  slug,
  province,
  imageUrl,
  description,
}: CityCardProps) {
  return (
    <article className="city-card">
      <Link href={`/cities/${slug}`}>
        <div
          className="city-card-media"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />

        <div className="city-card-body">
          <span>{province}</span>
          <h3>{name}</h3>

          {description && <p>{description}</p>}
        </div>
      </Link>
    </article>
  );
}