import { Controller, Get, Param, Query } from '@nestjs/common';
import { SlugParamDto } from '../common/dto/slug-param.dto';
import { HotelQueryDto } from './dto/hotel-query.dto';
import { HotelsService } from './hotels.service';

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get()
  findAll(@Query() query: HotelQueryDto) {
    return this.hotelsService.findAll(query);
  }

  @Get(':slug')
  findBySlug(@Param() { slug }: SlugParamDto) {
    return this.hotelsService.findBySlug(slug);
  }
}
