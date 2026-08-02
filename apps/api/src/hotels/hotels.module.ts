import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { HotelsController } from './hotels.controller';
import { HotelsService } from './hotels.service';

@Module({
  imports: [PrismaModule],
  controllers: [HotelsController],
  providers: [HotelsService],
})
export class HotelsModule {}
