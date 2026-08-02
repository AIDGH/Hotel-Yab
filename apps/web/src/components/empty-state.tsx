type EmptyStateProps = {
  kind: "empty" | "unavailable";
  title: string;
  description: string;
};

export function EmptyState({ kind, title, description }: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state-${kind}`}>
      <span className="empty-icon" aria-hidden="true">
        {kind === "empty" ? "◇" : "!"}
      </span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}
