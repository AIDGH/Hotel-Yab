const categoryLabels: Record<string, string> = {
  ACTOR: "بازیگر",
  ATHLETE: "ورزشکار",
  INFLUENCER: "اینفلوئنسر",
  MUSICIAN: "موسیقی‌دان",
  // POLITICIAN: "چهره سیاسی",
  // PUBLIC_FIGURE: "چهره عمومی",
  OTHER: "سایر",
};

const associationLabels: Record<string, string> = {
  STAYED: "اقامت داشته",
  VISITED: "بازدید کرده",
  ATTENDED_EVENT: "در رویداد شرکت کرده",
  COLLABORATED: "همکاری داشته",
  ENDORSED: "تأیید یا معرفی کرده",
  // OWNED: "مالکیت داشته",
  FILMED_AT: "در این مکان فیلم‌برداری کرده",
  OTHER: "ارتباط ثبت‌شده",
};

const sourceLabels: Record<string, string> = {
  NEWS_ARTICLE: "خبر",
  OFFICIAL_WEBSITE: "وب‌سایت رسمی",
  SOCIAL_MEDIA_POST: "پست شبکه اجتماعی",
  INTERVIEW: "مصاحبه",
  VIDEO: "ویدیو",
  PHOTO: "تصویر",
  OTHER: "منبع دیگر",
};

export function categoryLabel(value: string): string {
  return categoryLabels[value] ?? value;
}

export function associationLabel(value: string): string {
  return associationLabels[value] ?? value;
}

export function sourceLabel(value: string): string {
  return sourceLabels[value] ?? value;
}

export function formatDate(value: string | null): string | null {
  if (!value) return null;

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export const notableCategories = Object.entries(categoryLabels);
