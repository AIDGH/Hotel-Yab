export function normalizePersianSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fa-IR");
}
