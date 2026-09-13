import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  environmentFilePaths,
  environmentValidationSchema,
} from './config/environment';
import { HealthModule } from './health/health.module';
import { HotelsModule } from './hotels/hotels.module';
import { NotablePeopleModule } from './notable-people/notable-people.module';
import { AuthModule } from './auth/auth.module';
import { HotelReviewsModule } from './reviews/hotel-reviews.module';
import { VideoCommentsModule } from './video-comments/video-comments.module';
import { ModerationModule } from './moderation/moderation.module';
import { AccountActivityModule } from './account-activity/account-activity.module';
import { AccountLibraryModule } from './account-library/account-library.module';
import { CatalogModule } from './catalog/catalog.module';
import { CrawlReviewsModule } from './crawl-reviews/crawl-reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: environmentFilePaths,
      validationSchema: environmentValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    HealthModule,
    HotelsModule,
    NotablePeopleModule,
    AuthModule,
    HotelReviewsModule,
    VideoCommentsModule,
    ModerationModule,
    AccountActivityModule,
    AccountLibraryModule,
    CatalogModule,
    CrawlReviewsModule,
  ],
})
export class AppModule {}
