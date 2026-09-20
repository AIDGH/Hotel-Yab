import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';

export type InstagramCrawlRequest = {
  version: 1;
  url: string;
  headers: Record<string, string>;
  body: string;
};

const allowedHeaders = new Set([
  'accept',
  'accept-language',
  'content-type',
  'origin',
  'referer',
  'user-agent',
  'x-asbd-id',
  'x-fb-friendly-name',
  'x-fb-lsd',
  'x-ig-app-id',
]);
const allowedFormFields = new Set([
  '__a',
  '__comet_req',
  'doc_id',
  'dpr',
  'fb_api_caller_class',
  'fb_api_req_friendly_name',
  'lsd',
  'query_hash',
  'server_timestamps',
  'variables',
]);

export function sanitizeInstagramCrawlCurl(
  curl: string,
): Prisma.InputJsonValue {
  const value = curl.trim();
  if (!value.startsWith('curl ')) {
    throw new BadRequestException('متن واردشده باید با curl شروع شود');
  }

  const url = extractFirstArgument(value, /\bcurl\s+/);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new BadRequestException('آدرس درخواست Instagram معتبر نیست');
  }
  if (
    parsedUrl.protocol !== 'https:' ||
    !['instagram.com', 'www.instagram.com'].includes(parsedUrl.hostname) ||
    parsedUrl.pathname !== '/graphql/query'
  ) {
    throw new BadRequestException(
      'فقط درخواست GraphQL صفحه Instagram قابل ثبت است',
    );
  }

  const body = extractFlagArgument(value, ['--data-raw', '--data']);
  if (!body) {
    throw new BadRequestException('درخواست cURL فاقد داده GraphQL است');
  }
  const form = new URLSearchParams(body);
  const variables = form.get('variables');
  if (!variables || (!form.get('doc_id') && !form.get('query_hash'))) {
    throw new BadRequestException('درخواست GraphQL کامل نیست');
  }
  try {
    const parsed = JSON.parse(variables) as unknown;
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
  } catch {
    throw new BadRequestException('متغیرهای درخواست GraphQL معتبر نیستند');
  }
  const sanitizedForm = new URLSearchParams();
  for (const [name, fieldValue] of form.entries()) {
    if (allowedFormFields.has(name)) sanitizedForm.set(name, fieldValue);
  }

  const headers: Record<string, string> = {};
  for (const header of extractHeaderArguments(value)) {
    const separator = header.indexOf(':');
    if (separator < 1) continue;
    const name = header.slice(0, separator).trim().toLowerCase();
    const headerValue = header.slice(separator + 1).trim();
    if (allowedHeaders.has(name) && headerValue) headers[name] = headerValue;
  }
  headers['content-type'] = 'application/x-www-form-urlencoded';
  headers.origin = 'https://www.instagram.com';
  headers.referer = 'https://www.instagram.com/';

  return {
    version: 1,
    url: parsedUrl.toString(),
    headers,
    body: sanitizedForm.toString(),
  } satisfies InstagramCrawlRequest;
}

function extractHeaderArguments(command: string): string[] {
  const values: string[] = [];
  const pattern =
    /(?:^|\s)(?:-H|--header)\s+(?:'([^']*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|([^\s\\]+))/g;
  for (const match of command.matchAll(pattern)) {
    values.push(unescapeArgument(match[1] ?? match[2] ?? match[3] ?? ''));
  }
  return values;
}

function extractFlagArgument(command: string, flags: string[]): string {
  for (const flag of flags) {
    const value = extractFirstArgument(
      command,
      new RegExp(`(?:^|\\s)${escapeRegExp(flag)}\\s+`),
      false,
    );
    if (value) return value;
  }
  return '';
}

function extractFirstArgument(
  command: string,
  prefix: RegExp,
  required = true,
): string {
  const start = command.search(prefix);
  if (start < 0) {
    if (!required) return '';
    throw new BadRequestException('ساختار cURL معتبر نیست');
  }
  const matchedPrefix = command.slice(start).match(prefix)?.[0] ?? '';
  const remainder = command.slice(start + matchedPrefix.length).trimStart();
  const match = remainder.match(
    /^'([^']*)'|^"([^"\\]*(?:\\.[^"\\]*)*)"|^([^\s\\]+)/,
  );
  const result = match?.[1] ?? match?.[2] ?? match?.[3] ?? '';
  if (!result && required) {
    throw new BadRequestException('ساختار cURL معتبر نیست');
  }
  return unescapeArgument(result);
}

function unescapeArgument(value: string): string {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
