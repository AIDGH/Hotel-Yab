import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { NotablePeopleController } from './notable-people.controller';
import { NotablePeopleService } from './notable-people.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotablePeopleController],
  providers: [NotablePeopleService],
})
export class NotablePeopleModule {}
