import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { AccountActivityService } from './account-activity.service';

@Controller('account/activity')
@UseGuards(SessionAuthGuard)
@ApiTags('Account Activity')
export class AccountActivityController {
  constructor(private readonly activityService: AccountActivityService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's reviews and comments" })
  findMine(@Req() request: AuthenticatedRequest) {
    return this.activityService.findMine(request.user.id);
  }

  @Delete('video-comments/:id')
  @ApiOperation({ summary: "Delete the current user's comment" })
  @ApiParam({ name: 'id' })
  removeVideoComment(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.activityService.removeVideoComment(id, request.user.id);
  }
}
