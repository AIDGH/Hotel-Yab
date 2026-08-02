import { Controller, Get, Param, Query } from '@nestjs/common';
import { SlugParamDto } from '../common/dto/slug-param.dto';
import { NotablePersonQueryDto } from './dto/notable-person-query.dto';
import { NotablePeopleService } from './notable-people.service';

@Controller('notable-people')
export class NotablePeopleController {
  constructor(private readonly notablePeopleService: NotablePeopleService) {}

  @Get()
  findAll(@Query() query: NotablePersonQueryDto) {
    return this.notablePeopleService.findAll(query);
  }

  @Get(':slug')
  findBySlug(@Param() { slug }: SlugParamDto) {
    return this.notablePeopleService.findBySlug(slug);
  }
}
