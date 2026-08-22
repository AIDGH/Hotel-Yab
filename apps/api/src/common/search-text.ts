export function normalizePersianSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[أإٱ]/g, 'ا')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createPersianSearchVariants(value: string): string[] {
  const normalized = normalizePersianSearchText(value);
  if (!normalized) return [];

  const variants = new Set([normalized]);
  if (normalized.startsWith('ا')) variants.add(`آ${normalized.slice(1)}`);
  if (normalized.startsWith('آ')) variants.add(`ا${normalized.slice(1)}`);
  return [...variants];
}
