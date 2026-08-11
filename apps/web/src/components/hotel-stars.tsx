export function HotelStars({ value }: { value: number | null }) {
  if (value === null) return null;

  const label = `${value.toLocaleString("fa-IR")} ستاره`;

  return (
    <div className="hotel-stars" aria-label={`درجه رسمی هتل: ${label}`}>
      <span className="hotel-stars-icons" aria-hidden="true">
        {Array.from({ length: value }, (_, index) => (
          <span key={index}>★</span>
        ))}
      </span>
      <small>{label}</small>
    </div>
  );
}
