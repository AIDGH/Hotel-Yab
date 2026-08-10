import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { VideoCommentsController } from './video-comments.controller';
import { VideoCommentsService } from './video-comments.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [VideoCommentsController],
  providers: [VideoCommentsService],
})
export class VideoCommentsModule {}
