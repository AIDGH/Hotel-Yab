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
});
