import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import {
  CatalogController,
  PublicCatalogController,
} from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CatalogController, PublicCatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
