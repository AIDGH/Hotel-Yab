import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModeratorGuard } from '../auth/moderator.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CatalogService } from '../catalog/catalog.service';
import { CreateVideoDto } from '../catalog/dto/create-video.dto';
import { CrawlReviewsService } from './crawl-reviews.service';
import { CrawlReviewQueryDto } from './dto/crawl-review-query.dto';
import { UpdateCrawlReviewItemDto } from './dto/update-crawl-review-item.dto';

const CRAWL_HELPER_ARCHIVES = {
  'macos-arm64': 'HotelYab-Crawler-macOS-arm64.zip',
  'macos-x64': 'HotelYab-Crawler-macOS-x64.zip',
  'windows-x64': 'HotelYab-Crawler-Windows-x64.zip',
} as const;

@Controller('admin/crawl-helper-downloads')
@ApiTags('Admin Crawl Helper Downloads')
@UseGuards(SessionAuthGuard, ModeratorGuard)
export class CrawlHelperDownloadsController {
  @Get(':platform')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Download a crawler helper archive as staff' })
  async download(@Param('platform') platform: string): Promise<StreamableFile> {
    const filename =
      CRAWL_HELPER_ARCHIVES[platform as keyof typeof CRAWL_HELPER_ARCHIVES];
    if (!filename) {
      throw new NotFoundException('Crawler helper download was not found');
    }

    const file = await findCrawlerHelperArchive(filename);
    if (!file) {
      throw new NotFoundException('Crawler helper download is not available');
    }

    return new StreamableFile(createReadStream(file.path), {
      type: 'application/zip',
      disposition: `attachment; filename="${filename}"`,
      length: file.size,
    });
  }
}

async function findCrawlerHelperArchive(
  filename: string,
): Promise<{ path: string; size: number } | null> {
  const configuredRoot = process.env.CRAWL_HELPER_DOWNLOAD_DIR?.trim();
  const repositoryRoot = process.env.CRAWL_PROCESSING_REPO_ROOT?.trim();
  const directories = [
    configuredRoot,
    repositoryRoot
      ? resolve(repositoryRoot, 'output/crawl-helper-downloads')
      : undefined,
    resolve(process.cwd(), 'output/crawl-helper-downloads'),
    resolve(process.cwd(), '../../output/crawl-helper-downloads'),
  ].filter((value): value is string => Boolean(value));

  for (const directory of new Set(directories)) {
    const path = resolve(directory, filename);
    try {
      const metadata = await stat(path);
      if (metadata.isFile() && metadata.size > 0) {
        return { path, size: metadata.size };
      }
    } catch {
      // Try the next known private download directory.
    }
  }

  return null;
}

@Controller('admin/crawl-reviews')
@ApiTags('Admin Crawl Reviews')
@UseGuards(SessionAuthGuard, ModeratorGuard)
export class CrawlReviewsController {
  constructor(private readonly crawlReviewsService: CrawlReviewsService) {}

  @Get('bootstrap')
  getBootstrap() {
    return this.crawlReviewsService.getBootstrap();
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25_000_000 } }),
  )
  @ApiOperation({ summary: 'Create a review batch from crawler JSON' })
  uploadCrawlerOutput(
    @Req() request: AuthenticatedRequest,
    @UploadedFile()
    file:
      { buffer: Buffer; originalname: string; mimetype: string } | undefined,
  ) {
    return this.crawlReviewsService.uploadCrawlerOutput(file, request.user.id);
  }

  @Patch('items/:id')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrawlReviewItemDto,
  ) {
    return this.crawlReviewsService.updateItem(id, dto);
  }

  @Post(':id/finish-review')
  finishReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.crawlReviewsService.finishReview(id);
  }

  @Post(':id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.crawlReviewsService.complete(id);
  }

  @Post(':id/process')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Process a reviewed batch in the background' })
  processBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crawlReviewsService.startProcessing(
      id,
      request.user.id,
      request.user.role,
      request.sessionToken,
    );
  }

  @Post(':id/local-ticket')
  @ApiOperation({ summary: 'Create a short-lived local crawler ticket' })
  createLocalTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crawlReviewsService.createLocalProcessingTicket(
      id,
      request.user.id,
      request.user.role,
    );
  }

  @Post(':id/local-reset')
  resetLocalProcessing(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crawlReviewsService.resetLocalProcessing(
      id,
      request.user.id,
      request.user.role,
    );
  }

  @Get(':id/export')
  exportBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.crawlReviewsService.exportBatch(id);
  }

  @Delete(':id')
  deleteBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.crawlReviewsService.deleteBatch(id);
  }

  @Get(':id')
  getBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CrawlReviewQueryDto,
  ) {
    return this.crawlReviewsService.getBatch(id, query);
  }
}

@Controller('crawl-worker')
@ApiTags('Local Crawl Worker')
export class CrawlWorkerController {
  constructor(
    private readonly crawlReviewsService: CrawlReviewsService,
    private readonly catalogService: CatalogService,
  ) {}

  @Get(':id/export')
  async exportBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    await this.crawlReviewsService.assertLocalProcessingTicket(
      id,
      authorization,
    );
    return this.crawlReviewsService.exportBatch(id);
  }

  @Get(':id/catalog')
  async getCatalog(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    await this.crawlReviewsService.assertLocalProcessingTicket(
      id,
      authorization,
    );
    return this.catalogService.getAdminBootstrap();
  }

  @Post(':id/videos')
  async createVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateVideoDto,
  ) {
    await this.crawlReviewsService.assertLocalProcessingTicket(
      id,
      authorization,
    );
    await this.crawlReviewsService.assertLocalWorkerVideo(id, dto.sourceUrl);
    return this.catalogService.createVideo(dto);
  }

  @Put(':id/media')
  async uploadMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-media-path') mediaPath: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.crawlReviewsService.assertLocalProcessingTicket(
      id,
      authorization,
    );
    return this.crawlReviewsService.uploadLocalWorkerMedia(
      id,
      mediaPath,
      request,
    );
  }

  @Post(':id/complete')
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    await this.crawlReviewsService.assertLocalProcessingTicket(
      id,
      authorization,
    );
    return this.crawlReviewsService.completeLocalProcessing(id);
  }

  @Post(':id/failed')
  async failed(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization: string | undefined,
    @Body('message') message: string | undefined,
  ) {
    await this.crawlReviewsService.assertLocalProcessingTicket(
      id,
      authorization,
    );
    return this.crawlReviewsService.failLocalProcessing(id, message);
  }
}
