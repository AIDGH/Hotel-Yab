import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ContentModerationStatus } from '../generated/prisma/enums';
import { CreateVideoCommentDto } from './dto/create-video-comment.dto';

@Injectable()
export class VideoCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(videoId: string) {
    await this.requireVideo(videoId);
    const comments = await this.prisma.videoComment.findMany({
      where: {
        videoId,
        parentId: null,
        status: ContentModerationStatus.PUBLISHED,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
        replies: {
          where: { status: ContentModerationStatus.PUBLISHED },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            body: true,
            createdAt: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return { data: comments.map(serializeComment) };
  }

  async count(videoId: string) {
    await this.requireVideo(videoId);
    const count = await this.prisma.videoComment.count({
      where: { videoId, status: ContentModerationStatus.PUBLISHED },
    });
    return { data: { count } };
  }

  async create(videoId: string, userId: string, dto: CreateVideoCommentDto) {
    await this.requireVideo(videoId);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    if (!user.firstName || !user.lastName) {
      throw new BadRequestException('Complete your profile before commenting');
    }

    if (dto.parentId) {
      const parent = await this.prisma.videoComment.findFirst({
        where: { id: dto.parentId, videoId, parentId: null },
        select: { id: true },
      });
      if (!parent)
        throw new BadRequestException('The parent comment is invalid');
    }

    const comment = await this.prisma.videoComment.create({
      data: {
        videoId,
        userId,
        parentId: dto.parentId,
        body: dto.body.trim(),
      },
      select: {
        id: true,
        body: true,
        status: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    return {
      data: {
        id: comment.id,
        body: comment.body,
        status: comment.status,
        authorName: publicUserName(comment.user),
        createdAt: comment.createdAt.toISOString(),
        replies: [],
      },
    };
  }

  private async requireVideo(videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true },
    });
    if (!video) throw new NotFoundException('The video was not found');
  }
}

function serializeComment(comment: {
  id: string;
  body: string;
  createdAt: Date;
  user: { firstName: string | null; lastName: string | null };
  replies: Array<{
    id: string;
    body: string;
    createdAt: Date;
    user: { firstName: string | null; lastName: string | null };
  }>;
}) {
  return {
    id: comment.id,
    body: comment.body,
    authorName: publicUserName(comment.user),
    createdAt: comment.createdAt.toISOString(),
    replies: comment.replies.map((reply) => ({
      id: reply.id,
      body: reply.body,
      authorName: publicUserName(reply.user),
      createdAt: reply.createdAt.toISOString(),
    })),
  };
}

function publicUserName(user: {
  firstName: string | null;
  lastName: string | null;
}): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') || 'کاربر هتل‌یاب'
  );
}
