import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
