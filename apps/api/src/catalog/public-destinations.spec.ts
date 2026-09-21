import { NotFoundException } from '@nestjs/common';
import { DestinationType } from '../generated/prisma/enums';
import { CatalogService } from './catalog.service';

describe('CatalogService public destinations', () => {
  function createService() {
    const prisma = {
      destination: { findMany: jest.fn() },
      hotel: { findMany: jest.fn() },
      videoDestination: { findMany: jest.fn() },
      $transaction: jest.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries),
      ),
    };
    return {
      prisma,
      service: new CatalogService(prisma as never),
    };
  }

  it('shows only destinations with a published hotel or content relation', async () => {
    const { prisma, service } = createService();
    prisma.destination.findMany.mockResolvedValue([
      destination('city-hotel', DestinationType.CITY, 'كيش', []),
      destination('city-video', DestinationType.CITY, 'شیراز', []),
      destination('city-empty', DestinationType.CITY, 'شهر خالی', []),
      destination('province-child', DestinationType.PROVINCE, 'استان فعال', [
        { id: 'city-video', name: 'شیراز' },
      ]),
      destination('province-empty', DestinationType.PROVINCE, 'استان خالی', [
        { id: 'city-empty', name: 'شهر خالی' },
      ]),
    ]);
    prisma.hotel.findMany.mockResolvedValue([{ city: 'کیش' }]);
    prisma.videoDestination.findMany.mockResolvedValue([
      { destinationId: 'city-video' },
    ]);

    const result = await service.listPublicDestinations();

    expect(result.data.map(({ id }) => id)).toEqual([
      'city-hotel',
      'city-video',
      'province-child',
    ]);
    expect(result.data.every((item) => !('cities' in item))).toBe(true);
  });

  it('does not expose an inactive destination detail page', async () => {
    const { prisma, service } = createService();
    prisma.destination.findMany.mockResolvedValue([
      destination('city-empty', DestinationType.CITY, 'شهر خالی', []),
    ]);
    prisma.hotel.findMany.mockResolvedValue([]);
    prisma.videoDestination.findMany.mockResolvedValue([]);

    await expect(
      service.getPublicDestination(DestinationType.CITY, 'city-empty'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function destination(
  id: string,
  type: DestinationType,
  name: string,
  cities: Array<{ id: string; name: string }>,
) {
  return {
    id,
    type,
    slug: id,
    name,
    description: null,
    imageUrl: null,
    parentProvinceId: null,
    parentProvince: null,
    isFeatured: false,
    displayOrder: 1,
    primarySourceUrl: null,
    sourceType: null,
    notes: null,
    publicationStatus: 'PUBLISHED' as const,
    cities,
  };
}
