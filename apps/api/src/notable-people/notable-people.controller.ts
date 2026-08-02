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
import { NotablePersonQueryDto } from './dto/notable-person-query.dto';
import { NotablePeopleService } from './notable-people.service';

@Controller('notable-people')
@ApiTags('Notable People')
export class NotablePeopleController {
  constructor(private readonly notablePeopleService: NotablePeopleService) {}

  @Get()
  @ApiOperation({ summary: 'List public notable people' })
  @ApiOkResponse({ description: 'Paginated public notable-person results' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(@Query() query: NotablePersonQueryDto) {
    return this.notablePeopleService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get a public person with pending or verified hotel links',
  })
  @ApiParam({ name: 'slug', example: 'example-person' })
  @ApiOkResponse({ description: 'Person details with traceable evidence' })
  @ApiNotFoundResponse({ description: 'Person is missing or not public' })
  findBySlug(@Param() { slug }: SlugParamDto) {
    return this.notablePeopleService.findBySlug(slug);
  }
}
