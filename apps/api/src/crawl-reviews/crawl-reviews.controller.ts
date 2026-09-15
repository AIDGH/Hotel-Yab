import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
