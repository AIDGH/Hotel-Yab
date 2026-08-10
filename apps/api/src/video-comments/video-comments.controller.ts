import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CreateVideoCommentDto } from './dto/create-video-comment.dto';
import { VideoCommentsService } from './video-comments.service';

@Controller('videos/:videoId/comments')
@ApiTags('Video Comments')
export class VideoCommentsController {
  constructor(private readonly commentsService: VideoCommentsService) {}

  @Get()
  @ApiOperation({ summary: 'List published comments for a canonical video' })
  @ApiParam({ name: 'videoId' })
  findPublic(@Param('videoId') videoId: string) {
    return this.commentsService.findPublic(videoId);
  }

  @Get('count')
  count(@Param('videoId') videoId: string) {
    return this.commentsService.count(videoId);
  }

  @Post()
  @UseGuards(SessionAuthGuard)
  create(
    @Param('videoId') videoId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateVideoCommentDto,
  ) {
    return this.commentsService.create(videoId, request.user.id, dto);
  }
}
