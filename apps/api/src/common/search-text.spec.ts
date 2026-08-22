import {
  createPersianSearchVariants,
  normalizePersianSearchText,
} from './search-text';

describe('Persian search text', () => {
  it('normalizes Arabic forms and spacing', () => {
    expect(normalizePersianSearchText('  كيش‌ زيبا  ')).toBe('کیش زیبا');
  });

  it('treats آ and ا as interchangeable at the beginning', () => {
    expect(createPersianSearchVariants('اذربایجان')).toEqual([
      'اذربایجان',
      'آذربایجان',
    ]);
    expect(createPersianSearchVariants('آذربایجان')).toEqual([
      'آذربایجان',
      'اذربایجان',
    ]);
  });
});
