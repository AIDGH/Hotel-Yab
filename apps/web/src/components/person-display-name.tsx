const LATIN_IDENTIFIER_PATTERN = /^[A-Za-z0-9._-]+$/;

export function PersonDisplayName({ name }: { name: string }) {
  if (!LATIN_IDENTIFIER_PATTERN.test(name)) {
    return name;
  }

  return (
    <bdi className="latin-identifier" dir="ltr" lang="en">
      {name}
    </bdi>
  );
}
