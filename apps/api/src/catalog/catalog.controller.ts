import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { DestinationType } from '../generated/prisma/enums';
import { CatalogService } from './catalog.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { CreateNotablePersonDto } from './dto/create-notable-person.dto';
import { CreateVideoDto } from './dto/create-video.dto';

@Controller('admin/catalog')
@ApiTags('Admin Catalog')
@UseGuards(SessionAuthGuard, AdminGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('bootstrap')
  getBootstrap() {
    return this.catalogService.getAdminBootstrap();
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export catalog in the import-compatible JSON shape',
  })
  exportDataset() {
    return this.catalogService.exportImportDataset();
  }

  @Post('destinations')
  createDestination(@Body() dto: CreateDestinationDto) {
    return this.catalogService.createDestination(dto);
  }

  @Post('hotels')
  createHotel(@Body() dto: CreateHotelDto) {
    return this.catalogService.createHotel(dto);
  }

  @Post('notable-people')
  createNotablePerson(@Body() dto: CreateNotablePersonDto) {
    return this.catalogService.createNotablePerson(dto);
  }

  @Post('videos')
  createVideo(@Body() dto: CreateVideoDto) {
    return this.catalogService.createVideo(dto);
  }
}

@Controller()
@ApiTags('Travel Discovery')
export class PublicCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('destinations')
  listDestinations() {
    return this.catalogService.listPublicDestinations();
  }

  @Get('destinations/:type/:slug')
  getDestination(@Param('type') type: string, @Param('slug') slug: string) {
    const destinationType =
      type === 'cities'
        ? DestinationType.CITY
        : type === 'provinces'
          ? DestinationType.PROVINCE
          : null;
    if (!destinationType) throw new NotFoundException('نوع مقصد معتبر نیست');
    return this.catalogService.getPublicDestination(destinationType, slug);
  }

  @Get('travel-videos')
  listVideos() {
    return this.catalogService.listPublicVideos();
  }
}
