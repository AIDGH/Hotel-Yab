import { normalizeDigits, normalizeIranianMobile } from './auth-normalization';

describe('authentication normalization', () => {
  it('normalizes Persian and Arabic-Indic digits', () => {
    expect(normalizeDigits('۰۹۱۲٣٤٥٦۷۸۹')).toBe('09123456789');
  });

  it('normalizes an Iranian mobile written with Persian digits', () => {
    expect(normalizeIranianMobile('۰۹۱۲۱۲۳۴۵۶۷')).toBe('+989121234567');
  });
});
