import { UserRole } from '../generated/prisma/enums';

export const TRUSTED_PUBLISHED_COMMENT_COUNT = 2;
export const COMMENT_RATE_LIMIT = 5;
export const COMMENT_RATE_WINDOW_MS = 60_000;
export const AUTO_HIDE_REPORT_COUNT = 3;

const linkPattern = /(?:https?:\/\/|www\.|t\.me\/|wa\.me\/|instagram\.com\/)/iu;
const riskyTerms = [
  'بی ناموس',
  'بیناموس',
  'بی‌ناموس',
  'بی‌شرف',
  'بیشرف',
  'بی شرف',
  'حرامزاده',
  'حرومزاده',
  'حرومی',
  'کونی',
  'کیر',
  'کون',
  'کیرم',
  'کونم',
  'کص',
  'کصخل',
  'کصکش',
  'کصمغز',
  'کسخل',
  'کسکش',
  'کیر خر',
  'کیری',
  'عوضی',
  'بیشعور',
  'بی‌شعور',
  'بی شعور',
  'مادر جنده',
  'مادرجنده',
  'جنده',
  'خارکصه',
  'خوارکصه',
  'کصننه',
  'گا',
  'گاییدن',
  'گاییدمت',
  'بگا',
  'ننه',
  'خوار',
  'خار',
  'مادر',
  'زن',
  'زن جنده',
  'زنازاده',
  'زنا',
  'زنتو',
  'مادرتو',
  'مادرت',
  'پدرتو',
  'پدرت',
  'پدر جنده',
  'motherfucker',
  'asshole',
  'bastard',
  'slut',
  'cunt',
  'ass',
  'dick',
  'cuck',
  'cock',
  'penis',
  'vagina',
  'fuck',
  'bitch',
  'shit',
  'crap',
];

export type CommentModerationInput = {
  body: string;
  role: UserRole;
  publishedCommentCount: number;
  repeated: boolean;
};

export function decideCommentModeration(input: CommentModerationInput) {
  const reasons: string[] = [];
  const normalizedBody = normalizeCommentBody(input.body);

  if (linkPattern.test(normalizedBody)) reasons.push('دارای لینک');
  if (riskyTerms.some((term) => normalizedBody.includes(term))) {
    reasons.push('دارای عبارت پرریسک');
  }
  if (input.repeated) reasons.push('متن تکراری');

  const trusted =
    input.role === UserRole.ADMIN ||
    input.role === UserRole.MODERATOR ||
    input.publishedCommentCount >= TRUSTED_PUBLISHED_COMMENT_COUNT;

  if (!trusted) reasons.push('کمتر از دو دیدگاه تأییدشده');

  return {
    publishImmediately: trusted && reasons.length === 0,
    reasons,
  };
}

export function normalizeCommentBody(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fa-IR');
}
