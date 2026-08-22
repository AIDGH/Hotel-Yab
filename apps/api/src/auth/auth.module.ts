import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';
import { ModeratorGuard } from './moderator.guard';
import { AdminGuard } from './admin.guard';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [PrismaModule, SmsModule],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, ModeratorGuard, AdminGuard],
  exports: [AuthService, SessionAuthGuard, ModeratorGuard, AdminGuard],
})
export class AuthModule {}
