import { UnauthorizedException } from '@nestjs/common';

export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) =>
      String(digit.charCodeAt(0) - '۰'.charCodeAt(0)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String(digit.charCodeAt(0) - '٠'.charCodeAt(0)),
    );
}

export function transformAuthDigits({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? normalizeDigits(value).trim() : value;
}

export function normalizeIranianMobile(value: string): string {
  const digits = normalizeDigits(value).replace(/\D/g, '');
  const local = digits.startsWith('0098')
    ? digits.slice(4)
    : digits.startsWith('98')
      ? digits.slice(2)
      : digits.startsWith('0')
        ? digits.slice(1)
        : digits;
  if (!/^9\d{9}$/.test(local)) {
    throw new UnauthorizedException('The mobile number is invalid');
  }
  return `+98${local}`;
}
