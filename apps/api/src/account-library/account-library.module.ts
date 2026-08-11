import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { AccountLibraryController } from './account-library.controller';
import { AccountLibraryService } from './account-library.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AccountLibraryController],
  providers: [AccountLibraryService],
})
export class AccountLibraryModule {}
