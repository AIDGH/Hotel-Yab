import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
