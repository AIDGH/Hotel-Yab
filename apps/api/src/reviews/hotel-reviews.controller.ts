import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SlugParamDto } from '../common/dto/slug-param.dto';
import { UpsertHotelReviewDto } from './dto/upsert-hotel-review.dto';
import { HotelReviewsService } from './hotel-reviews.service';

@Controller('hotels/:slug/reviews')
@ApiTags('Hotel Reviews')
export class HotelReviewsController {
  constructor(private readonly reviewsService: HotelReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'List published hotel reviews and rating summary' })
  findPublic(@Param() { slug }: SlugParamDto) {
    return this.reviewsService.findPublic(slug);
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  findMine(
    @Param() { slug }: SlugParamDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviewsService.findMine(slug, request.user.id);
  }

  @Put('me')
  @UseGuards(SessionAuthGuard)
  upsert(
    @Param() { slug }: SlugParamDto,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpsertHotelReviewDto,
  ) {
    return this.reviewsService.upsert(slug, request.user.id, dto);
  }

  @Delete('me')
  @UseGuards(SessionAuthGuard)
  remove(
    @Param() { slug }: SlugParamDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviewsService.remove(slug, request.user.id);
  }
}
