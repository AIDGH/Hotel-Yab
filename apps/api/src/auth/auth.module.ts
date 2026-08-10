import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';
import { ModeratorGuard } from './moderator.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, ModeratorGuard],
  exports: [AuthService, SessionAuthGuard, ModeratorGuard],
})
export class AuthModule {}
