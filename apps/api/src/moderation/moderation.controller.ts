import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModeratorGuard } from '../auth/moderator.guard';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ModerateContentDto } from './dto/moderate-content.dto';
import { ModerationQueryDto } from './dto/moderation-query.dto';
import { ModerationService } from './moderation.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

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

  @Delete('hotel-reviews/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Permanently delete a hotel review as admin' })
  deleteHotelReview(@Param('id') id: string) {
    return this.moderationService.deleteHotelReview(id);
  }

  @Delete('video-comments/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Permanently delete a video comment as admin' })
  deleteVideoComment(@Param('id') id: string) {
    return this.moderationService.deleteVideoComment(id);
  }

  @Patch('users/:id/status')
  @UseGuards(AdminGuard)
  updateUserStatus(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.moderationService.updateUserStatus(
      id,
      request.user.id,
      dto.status,
    );
  }
}
