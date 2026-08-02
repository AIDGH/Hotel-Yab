import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SlugParamDto } from '../common/dto/slug-param.dto';
import { HotelQueryDto } from './dto/hotel-query.dto';
import { HotelsService } from './hotels.service';

@Controller('hotels')
@ApiTags('Hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get()
  @ApiOperation({ summary: 'List public hotels' })
  @ApiOkResponse({ description: 'Paginated public hotel results' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(@Query() query: HotelQueryDto) {
    return this.hotelsService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get a public hotel with pending or verified people links',
  })
  @ApiParam({ name: 'slug', example: 'example-hotel' })
  @ApiOkResponse({ description: 'Hotel details with traceable evidence' })
  @ApiNotFoundResponse({ description: 'Hotel is missing or not public' })
  findBySlug(@Param() { slug }: SlugParamDto) {
    return this.hotelsService.findBySlug(slug);
  }
}
