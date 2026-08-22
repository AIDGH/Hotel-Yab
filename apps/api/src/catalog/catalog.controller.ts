import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModeratorGuard } from '../auth/moderator.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { DestinationType } from '../generated/prisma/enums';
import { CatalogService } from './catalog.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { CreateNotablePersonDto } from './dto/create-notable-person.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { ApplyFollowerUpdatesDto } from './dto/apply-follower-updates.dto';

@Controller('admin/catalog')
@ApiTags('Admin Catalog')
@UseGuards(SessionAuthGuard, ModeratorGuard)
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

  @Post('followers')
  @ApiOperation({
    summary: 'Apply Instagram follower counts and daily snapshots',
  })
  applyFollowerUpdates(@Body() dto: ApplyFollowerUpdatesDto) {
    return this.catalogService.applyFollowerUpdates(dto);
  }

  @Post('videos')
  createVideo(@Body() dto: CreateVideoDto) {
    return this.catalogService.createVideo(dto);
  }

  @Patch('destinations/:id')
  updateDestination(
    @Param('id') id: string,
    @Body() dto: CreateDestinationDto,
  ) {
    return this.catalogService.updateDestination(id, dto);
  }

  @Patch('hotels/:id')
  updateHotel(@Param('id') id: string, @Body() dto: CreateHotelDto) {
    return this.catalogService.updateHotel(id, dto);
  }

  @Patch('notable-people/:id')
  updateNotablePerson(
    @Param('id') id: string,
    @Body() dto: CreateNotablePersonDto,
  ) {
    return this.catalogService.updateNotablePerson(id, dto);
  }

  @Post('media')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 15_000_000 } }),
  )
  uploadMedia(
    @Body('kind') kind: string,
    @Body('slug') slug: string,
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
  ) {
    return this.catalogService.uploadMedia(kind, slug, file);
  }

  @Delete('destinations/:id')
  deleteDestination(@Param('id') id: string) {
    return this.catalogService.deleteDestination(id);
  }

  @Delete('hotels/:id')
  deleteHotel(@Param('id') id: string) {
    return this.catalogService.deleteHotel(id);
  }

  @Delete('notable-people/:id')
  deleteNotablePerson(@Param('id') id: string) {
    return this.catalogService.deleteNotablePerson(id);
  }

  @Delete('videos/:id')
  deleteVideo(@Param('id') id: string) {
    return this.catalogService.deleteVideo(id);
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
