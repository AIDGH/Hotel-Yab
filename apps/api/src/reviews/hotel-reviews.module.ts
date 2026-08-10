import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { HotelReviewsController } from './hotel-reviews.controller';
import { HotelReviewsService } from './hotel-reviews.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HotelReviewsController],
  providers: [HotelReviewsService],
})
export class HotelReviewsModule {}
