import { Transform } from 'class-transformer';

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const instagramPattern = /^[A-Za-z0-9._]+$/;
export const mediaPathPattern = /^(?:\/|https?:\/\/)/;

export function EmptyToNull() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });
}

export function NormalizeInstagram() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim().replace(/^@/, '').toLowerCase()
      : value,
  );
}
