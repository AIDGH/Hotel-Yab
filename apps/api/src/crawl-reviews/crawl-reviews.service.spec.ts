import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/environment';
import { PrismaService } from '../database/prisma.service';
import { CrawlReviewBatchStatus } from '../generated/prisma/enums';
import { CrawlReviewsService } from './crawl-reviews.service';

type StoredBatch = {
  id: string;
  instagramUsername: string;
  contentHash: string;
  status: CrawlReviewBatchStatus;
};
type StoredItem = {
  batchId: string;
  instagramUsername: string;
  shortcode: string;
  displayOrder: number;
};

function setup() {
  const batches: StoredBatch[] = [];
  const items: StoredItem[] = [];
  const delegates = {
    destination: { findMany: jest.fn().mockResolvedValue([]) },
    hotel: { findMany: jest.fn().mockResolvedValue([]) },
    crawlReviewBatch: {
      create: jest.fn(
        ({ data }: { data: Omit<StoredBatch, 'id' | 'status'> }) => {
          const batch = {
            ...data,
            id: `batch-${batches.length + 1}`,
            status: CrawlReviewBatchStatus.REVIEWING,
          };
          batches.push(batch);
          return Promise.resolve({ id: batch.id });
        },
      ),
      findFirst: jest.fn(
        ({ where }: { where: { instagramUsername: string } }) => {
          const batch = batches.find(
            (entry) => entry.instagramUsername === where.instagramUsername,
          );
          return Promise.resolve(
            batch ? { id: batch.id, status: batch.status } : null,
          );
        },
      ),
    },
    crawlReviewItem: {
      findMany: jest.fn(() => Promise.resolve([...items])),
      createMany: jest.fn(({ data }: { data: StoredItem[] }) => {
        items.push(...data);
        return Promise.resolve({ count: data.length });
      }),
    },
  };
  const prisma = {
    ...delegates,
    $transaction: (
      operation:
        | Promise<unknown>[]
        | ((transaction: typeof delegates) => Promise<unknown>),
    ) =>
      Array.isArray(operation) ? Promise.all(operation) : operation(delegates),
  } as unknown as PrismaService;
  const service = new CrawlReviewsService(
    prisma,
    {} as ConfigService<EnvironmentVariables, true>,
  );
  return { service, batches, items, delegates };
}

function candidate(instagram_username: string, shortcode: string) {
  return {
    instagram_username,
    shortcode,
    source_url: `https://www.instagram.com/p/${shortcode}/`,
  };
}

function file(
  rows: ReturnType<typeof candidate>[],
  originalname = 'combined.json',
) {
  return {
    originalname,
    mimetype: 'application/json',
    buffer: Buffer.from(JSON.stringify(rows)),
  };
}

describe('CrawlReviewsService multi-account uploads', () => {
  it('groups accounts after normalization and preserves per-account order and ownership', async () => {
    const { service, batches, items } = setup();
    const result = await service.uploadCrawlerOutput(
      file([
        candidate('@ALPHA', 'a1'),
        candidate('beta', 'b1'),
        candidate('alpha', 'a2'),
      ]),
      'admin',
    );

    expect(result.data).toMatchObject({ totalItems: 3, skippedExisting: 0 });
    expect(result.data.batches).toHaveLength(2);
    expect(batches.map((batch) => batch.instagramUsername)).toEqual([
      'alpha',
      'beta',
    ]);
    expect(new Set(batches.map((batch) => batch.contentHash)).size).toBe(2);
    expect(
      items.map(({ instagramUsername, shortcode, displayOrder, batchId }) => ({
        instagramUsername,
        shortcode,
        displayOrder,
        batchId,
      })),
    ).toEqual([
      {
        instagramUsername: 'alpha',
        shortcode: 'a1',
        displayOrder: 1,
        batchId: 'batch-1',
      },
      {
        instagramUsername: 'alpha',
        shortcode: 'a2',
        displayOrder: 2,
        batchId: 'batch-1',
      },
      {
        instagramUsername: 'beta',
        shortcode: 'b1',
        displayOrder: 1,
        batchId: 'batch-2',
      },
    ]);
  });

  it('does not duplicate rows when the same mixed file is uploaded again', async () => {
    const { service, batches, items } = setup();
    const input = file([candidate('alpha', 'a1'), candidate('beta', 'b1')]);
    await service.uploadCrawlerOutput(input, 'admin');
    const second = await service.uploadCrawlerOutput(input, 'admin');
    expect(second.data).toMatchObject({
      totalItems: 0,
      skippedExisting: 2,
      id: 'batch-1',
    });
    expect(batches).toHaveLength(2);
    expect(items).toHaveLength(2);
  });

  it('deduplicates by account and shortcode and selects the batch containing new rows', async () => {
    const { service, items } = setup();
    await service.uploadCrawlerOutput(
      file([candidate('alpha', 'shared')]),
      'admin',
    );
    const result = await service.uploadCrawlerOutput(
      file([candidate('alpha', 'shared'), candidate('beta', 'shared')]),
      'admin',
    );
    expect(result.data).toMatchObject({
      totalItems: 1,
      skippedExisting: 1,
      id: 'batch-2',
      instagramUsername: 'beta',
    });
    expect(items.map((item) => item.instagramUsername)).toEqual([
      'alpha',
      'beta',
    ]);
  });

  it('keeps legacy single-account and filename fallbacks', async () => {
    const { service, items } = setup();
    await service.uploadCrawlerOutput(
      file([candidate('@ALPHA', 'a1'), candidate('', 'a2')]),
      'admin',
    );
    await service.uploadCrawlerOutput(
      file([candidate('', 'b1')], 'beta.json'),
      'admin',
    );
    expect(items.map((item) => item.instagramUsername)).toEqual([
      'alpha',
      'alpha',
      'beta',
    ]);
  });

  it('does not guess a missing owner in a mixed file or write partial batches', async () => {
    const { service, delegates } = setup();
    await expect(
      service.uploadCrawlerOutput(
        file([
          candidate('alpha', 'a1'),
          candidate('beta', 'b1'),
          candidate('', 'missing'),
        ]),
        'admin',
      ),
    ).rejects.toThrow('آیدی اینستاگرام ردیف 3 مشخص نیست');
    expect(delegates.crawlReviewBatch.create).not.toHaveBeenCalled();
  });

  it('still rejects duplicate links within the same normalized account', async () => {
    const { service, delegates } = setup();
    await expect(
      service.uploadCrawlerOutput(
        file([candidate('@ALPHA', 'a1'), candidate('alpha', 'a1')]),
        'admin',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(delegates.crawlReviewBatch.create).not.toHaveBeenCalled();
  });
});
