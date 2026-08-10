import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModeratorGuard } from '../auth/moderator.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ModerateContentDto } from './dto/moderate-content.dto';
import { ModerationQueryDto } from './dto/moderation-query.dto';
import { ModerationService } from './moderation.service';

@Controller('admin/moderation')
@ApiTags('Moderation')
@UseGuards(SessionAuthGuard, ModeratorGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('queue')
  @ApiOperation({
    summary: 'List hotel reviews and video comments by moderation status',
  })
  getQueue(@Query() query: ModerationQueryDto) {
    return this.moderationService.getQueue(query.status);
  }

  @Patch('hotel-reviews/:id')
  moderateHotelReview(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ModerateContentDto,
  ) {
    return this.moderationService.moderateHotelReview(id, request.user.id, dto);
  }

  @Patch('video-comments/:id')
  moderateVideoComment(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ModerateContentDto,
  ) {
    return this.moderationService.moderateVideoComment(
      id,
      request.user.id,
      dto,
    );
  }
}
