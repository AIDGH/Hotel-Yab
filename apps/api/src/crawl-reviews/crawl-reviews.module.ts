import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { CrawlReviewsController } from './crawl-reviews.controller';
import { CrawlReviewsService } from './crawl-reviews.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CrawlReviewsController],
  providers: [CrawlReviewsService],
})
export class CrawlReviewsModule {}
