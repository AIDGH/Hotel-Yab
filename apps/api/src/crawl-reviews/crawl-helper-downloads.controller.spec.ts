import { NotFoundException, StreamableFile } from '@nestjs/common';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CrawlHelperDownloadsController } from './crawl-reviews.controller';

describe('CrawlHelperDownloadsController', () => {
  const originalDirectory = process.env.CRAWL_HELPER_DOWNLOAD_DIR;
  let directory: string;
  let controller: CrawlHelperDownloadsController;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'hotel-yab-helper-download-'));
    process.env.CRAWL_HELPER_DOWNLOAD_DIR = directory;
    controller = new CrawlHelperDownloadsController();
  });

  afterEach(async () => {
    if (originalDirectory === undefined) {
      delete process.env.CRAWL_HELPER_DOWNLOAD_DIR;
    } else {
      process.env.CRAWL_HELPER_DOWNLOAD_DIR = originalDirectory;
    }
    await rm(directory, { recursive: true, force: true });
  });

  it('streams an existing platform archive', async () => {
    await writeFile(
      join(directory, 'HotelYab-Crawler-macOS-arm64.zip'),
      Buffer.from('zip-content'),
    );

    const result = await controller.download('macos-arm64');

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getHeaders()).toMatchObject({
      type: 'application/zip',
      length: 11,
      disposition: 'attachment; filename="HotelYab-Crawler-macOS-arm64.zip"',
    });
  });

  it('rejects unknown platforms', async () => {
    await expect(controller.download('linux')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects missing archives', async () => {
    await expect(controller.download('windows-x64')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
