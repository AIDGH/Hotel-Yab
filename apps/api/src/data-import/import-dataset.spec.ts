import { DestinationType, PublicationStatus } from '../generated/prisma/enums';
import { ImportDataset } from './dataset';
import { importDataset } from './import-dataset';

describe('importDataset', () => {
  it('clears existing destination positions before applying imported order', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const upsert = jest.fn().mockResolvedValue({});
    const transaction = {
      destination: {
        updateMany,
        upsert,
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof transaction) => Promise<void>) =>
          callback(transaction),
      ),
    };
    const dataset: ImportDataset = {
      hotels: [],
      notablePeople: [],
      sources: [],
      associations: [],
      destinations: [
        {
          type: DestinationType.PROVINCE,
          slug: 'second-province',
          name: 'Second Province',
          displayOrder: 1,
          publicationStatus: PublicationStatus.PUBLISHED,
        },
        {
          type: DestinationType.PROVINCE,
          slug: 'first-province',
          name: 'First Province',
          displayOrder: 2,
          publicationStatus: PublicationStatus.PUBLISHED,
        },
      ],
      videos: [],
    };

    await importDataset(prisma as never, dataset);

    expect(updateMany).toHaveBeenCalledWith({
      data: { displayOrder: null },
    });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      upsert.mock.invocationCallOrder[0],
    );
  });
});
