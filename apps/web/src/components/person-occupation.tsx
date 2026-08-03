const FOLLOWER_COUNT_PATTERN = /[0-9][0-9,.]*[KMB]?(?=\s*دنبال‌کننده)/i;

export function PersonOccupation({ value }: { value: string }) {
  const match = FOLLOWER_COUNT_PATTERN.exec(value);

  if (!match || match.index === undefined) {
    return value;
  }

  const start = match.index;
  const end = start + match[0].length;

  return (
    <>
      {value.slice(0, start)}
      <bdi className="latin-number" dir="ltr" lang="en">
        {match[0]}
      </bdi>
      {value.slice(end)}
    </>
  );
}
