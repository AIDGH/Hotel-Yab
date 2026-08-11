import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { AccountActivityController } from './account-activity.controller';
import { AccountActivityService } from './account-activity.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AccountActivityController],
  providers: [AccountActivityService],
})
export class AccountActivityModule {}
