import { validateDataset } from './dataset';

const validDataset = {
  hotels: [
    {
      slug: 'example-hotel',
      name: 'Example Hotel',
      countryCode: 'US',
      city: 'Example City',
    },
  ],
  notablePeople: [
    {
      slug: 'example-person',
      displayName: 'Example Person',
      primaryCategory: 'ATHLETE',
    },
  ],
  sources: [
    {
      url: 'https://example.com/source',
      type: 'OFFICIAL_WEBSITE',
      title: 'Example source',
    },
  ],
  associations: [
    {
      referenceKey: 'example-person-example-hotel-stay',
      hotelSlug: 'example-hotel',
      notablePersonSlug: 'example-person',
      type: 'STAYED',
      summary: 'A sufficiently detailed example association.',
      evidence: [
        {
          sourceUrl: 'https://example.com/source',
          isPrimary: true,
        },
      ],
    },
  ],
};

describe('validateDataset', () => {
  it('accepts a traceable pending association', () => {
    expect(validateDataset(validDataset)).toMatchObject({
      associations: [
        {
          verificationStatus: 'PENDING',
          evidence: [{ isPrimary: true }],
        },
      ],
    });
  });

  it('accepts a pending association while its evidence is being collected', () => {
    const dataset = structuredClone(validDataset);
    dataset.associations[0].evidence = [];

    expect(validateDataset(dataset).associations[0]).toMatchObject({
      verificationStatus: 'PENDING',
      evidence: [],
    });
  });

  it('accepts an optional Instagram handle without the @ prefix', () => {
    const dataset = structuredClone(validDataset);
    Object.assign(dataset.notablePeople[0], {
      instagramHandle: 'example.person_1',
    });

    expect(validateDataset(dataset).notablePeople[0]).toMatchObject({
      instagramHandle: 'example.person_1',
    });
  });

  it('accepts an official hotel star rating from 1 to 5', () => {
    const dataset = structuredClone(validDataset);
    Object.assign(dataset.hotels[0], { starRating: 5 });

    expect(validateDataset(dataset).hotels[0]).toMatchObject({
      starRating: 5,
    });
  });

  it('accepts stable root-relative catalog media paths', () => {
    const dataset = structuredClone(validDataset);
    Object.assign(dataset.hotels[0], {
      imageUrl: '/images/hotels/example-hotel.webp',
      logoUrl: '/images/hotels/example-hotel-logo.webp',
    });
    Object.assign(dataset.notablePeople[0], {
      imageUrl: '/images/people/example-person.webp',
    });

    expect(validateDataset(dataset)).toMatchObject({
      hotels: [
        {
          imageUrl: '/images/hotels/example-hotel.webp',
          logoUrl: '/images/hotels/example-hotel-logo.webp',
        },
      ],
      notablePeople: [{ imageUrl: '/images/people/example-person.webp' }],
    });
  });

  it('accepts Unicode characters in an HTTP source URL', () => {
    const dataset = structuredClone(validDataset);
    Object.assign(dataset, {
      destinations: [
        {
          type: 'PROVINCE',
          slug: 'example-province',
          name: 'Example Province',
          primarySourceUrl: 'https://fa.wikipedia.org/wiki/استان_نمونه',
        },
      ],
    });

    expect(validateDataset(dataset).destinations[0].primarySourceUrl).toBe(
      'https://fa.wikipedia.org/wiki/استان_نمونه',
    );
  });

  it('rejects unsafe catalog media schemes', () => {
    const dataset = structuredClone(validDataset);
    Object.assign(dataset.hotels[0], { imageUrl: 'javascript:alert(1)' });

    expect(() => validateDataset(dataset)).toThrow('imageUrl');
  });

  it('rejects a hotel star rating outside the official 1–5 range', () => {
    const dataset = structuredClone(validDataset);
    Object.assign(dataset.hotels[0], { starRating: 6 });

    expect(() => validateDataset(dataset)).toThrow('starRating');
  });

  it('rejects an Instagram handle containing the @ prefix', () => {
    const dataset = structuredClone(validDataset);
    Object.assign(dataset.notablePeople[0], {
      instagramHandle: '@example.person',
    });

    expect(() => validateDataset(dataset)).toThrow('instagramHandle');
  });

  it('rejects a verified association without evidence', () => {
    const dataset = structuredClone(validDataset);
    Object.assign(dataset.associations[0], {
      verificationStatus: 'VERIFIED',
      verifiedAt: '2026-01-12T00:00:00.000Z',
      evidence: [],
    });

    expect(() => validateDataset(dataset)).toThrow(
      'requires at least one evidence source',
    );
  });

  it('requires a verification timestamp for verified associations', () => {
    const dataset = structuredClone(validDataset);
    Object.assign(dataset.associations[0], {
      verificationStatus: 'VERIFIED',
    });

    expect(() => validateDataset(dataset)).toThrow('verifiedAt');
  });

  it('rejects references missing from the same dataset', () => {
    const dataset = structuredClone(validDataset);
    dataset.associations[0].hotelSlug = 'missing-hotel';

    expect(() => validateDataset(dataset)).toThrow(
      'references unknown hotel "missing-hotel"',
    );
  });

  it('accepts enriched videos with local media and canonical relations', () => {
    const dataset = structuredClone(validDataset);
    Object.assign(dataset.notablePeople[0], {
      instagramHandle: 'example.person',
    });
    Object.assign(dataset, {
      destinations: [
        {
          type: 'PROVINCE',
          slug: 'example-province',
          name: 'Example Province',
          imageUrl: '/images/provinces/example-province.webp',
        },
        {
          type: 'CITY',
          slug: 'example-city',
          name: 'Example City',
          parentProvinceSlug: 'example-province',
          imageUrl: '/images/cities/example-city.webp',
        },
      ],
      videos: [
        {
          id: 'example.person-001',
          videoCategory: 'TRAVEL',
          contentKind: 'POST',
          instagramUsername: 'example.person',
          sourceUrl: 'https://www.instagram.com/p/example/',
          mediaUrl: '/travel-videos/example.person/001.mp4',
          thumbnailUrl: '/travel-videos/example.person/001-thumbnail.webp',
          mediaItems: [
            {
              mediaType: 'IMAGE',
              mediaUrl: '/travel-videos/example-person/001-01.webp',
            },
            {
              mediaType: 'IMAGE',
              mediaUrl: '/travel-videos/example-person/001-02.webp',
            },
          ],
          destinationRefs: [{ type: 'CITY', slug: 'example-city' }],
          hotelSlugs: ['example-hotel'],
        },
      ],
    });

    expect(validateDataset(dataset)).toMatchObject({
      destinations: [{ type: 'PROVINCE' }, { type: 'CITY' }],
      videos: [
        {
          id: 'example.person-001',
          videoCategory: 'TRAVEL',
          contentKind: 'POST',
          mediaItems: [{ mediaType: 'IMAGE' }, { mediaType: 'IMAGE' }],
          destinationRefs: [{ type: 'CITY', slug: 'example-city' }],
          hotelSlugs: ['example-hotel'],
        },
      ],
    });
  });

  it('accepts mixed image and video items in posts and stories', () => {
    const dataset = structuredClone(validDataset);
    Object.assign(dataset, {
      videos: [
        {
          id: 'mixed-post',
          contentKind: 'POST',
          mediaItems: [
            {
              mediaType: 'IMAGE',
              mediaUrl: '/travel-videos/example-person/mixed-01.webp',
            },
            {
              mediaType: 'VIDEO',
              mediaUrl: '/travel-videos/example-person/mixed-02.mp4',
            },
          ],
        },
        {
          id: 'mixed-story',
          contentKind: 'STORY',
          mediaItems: [
            {
              mediaType: 'VIDEO',
              mediaUrl: '/travel-videos/example-person/story-01.mp4',
            },
            {
              mediaType: 'IMAGE',
              mediaUrl: '/travel-videos/example-person/story-02.webp',
            },
          ],
        },
      ],
    });

    expect(validateDataset(dataset).videos).toMatchObject([
      {
        id: 'mixed-post',
        mediaItems: [{ mediaType: 'IMAGE' }, { mediaType: 'VIDEO' }],
      },
      {
        id: 'mixed-story',
        mediaItems: [{ mediaType: 'VIDEO' }, { mediaType: 'IMAGE' }],
      },
    ]);
  });
});
