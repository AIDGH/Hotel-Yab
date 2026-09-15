import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PrismaModule } from '../database/prisma.module';
import {
  CrawlReviewsController,
  CrawlWorkerController,
} from './crawl-reviews.controller';
import { CrawlReviewsService } from './crawl-reviews.service';

@Module({
  imports: [PrismaModule, AuthModule, CatalogModule],
  controllers: [CrawlReviewsController, CrawlWorkerController],
  providers: [CrawlReviewsService],
})
export class CrawlReviewsModule {}
